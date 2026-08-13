#!/usr/bin/env node
/**
 * Test runner for the LogiTrack suite.
 *
 * The project's tests use Node's built-in test runner (`node:test`) executed
 * through `tsx`, together with:
 *   - `--experimental-test-module-mocks` — required by `mock.module(...)`,
 *     which every controller/route test relies on to inject Prisma/Redis/auth
 *     doubles.
 *   - `--test-force-exit` — tests open (mocked, but still real) module-level
 *     resources; without this the process can hang after the last test because
 *     of lingering handles. This is what makes the suite CI-safe.
 *   - `--import global-jsdom/register` — the component tests (`*.test.tsx`)
 *     render via @testing-library/react and need a DOM (`document`, `window`).
 *   - `--import ./test-loader-hooks.mjs` — registers an ESM resolve hook
 *     that aliases the `server-only` marker package to a no-op, the same
 *     substitution Next's bundler makes for server bundles. Without it, any
 *     module reachable from a test that does `import "server-only"` (e.g.
 *     entitlement resolution reached from the session controller) throws
 *     outside of Next's build.
 *
 * Files are sharded across a bounded pool of worker processes. Sharding keeps
 * `mock.module` state from leaking between unrelated files (each shard is a
 * fresh process) and bounds wall-clock time. Each shard has a hard timeout so
 * a single hung test file fails that shard instead of stalling the whole run.
 *
 * Usage:
 *   node scripts/run-tests.mjs              # run all unit tests (no *.live.test.*)
 *   node scripts/run-tests.mjs app/api      # only files under a path substring
 *   node scripts/run-tests.mjs --live       # run *.live.test.* integration tests
 *                                           # (real services, no jsdom)
 */

import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, relative } from "node:path";
import os from "node:os";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TEST_ROOTS = ["app"];

// Resolve tsx's CLI entry so we can spawn it with `node` directly — avoids the
// npx/.cmd + shell dance that breaks (EINVAL / DEP0190) on Windows.
const require = createRequire(import.meta.url);
const TSX_CLI = require.resolve("tsx/cli");

// Load env the same way `dotenv -c` did for the old script: `.env` as the base,
// `.env.local` layered on top (local wins). Child processes inherit this.
for (const file of [".env", ".env.local"]) {
  dotenv.config({ path: join(ROOT, file), override: true });
}

/**
 * Files are executed in small fixed-size batches, each in its own tsx process.
 *
 * Batch size is a deliberate sweet spot. Measured throughput:
 *   1 file  ~8s | 5 files ~11s | 10 files ~56s
 * Loading a handful of files in one process amortises tsx transpilation, but
 * component tests (`*.test.tsx`) accumulate jsdom/module state, so throughput
 * degrades super-linearly past ~5-6 files. A fresh process per batch caps that
 * accumulation. `mock.module` isolation between unrelated files is a bonus.
 *
 * CONCURRENCY runs a few batches at once without oversaturating the CPU (which
 * on Windows inflated per-file time ~5×).
 */
const BATCH_SIZE = 5;
const CONCURRENCY = Math.max(2, Math.min(os.cpus().length - 1, 3));
/**
 * Hard timeout per batch (ms). A ~5-file batch normally completes in well
 * under a minute in isolation, but under full-suite CONCURRENCY on Windows
 * (documented above: ~5x per-file inflation from CPU contention when 3
 * tsx processes run at once) a batch of MUI-heavy dialog/table component
 * tests can legitimately take 2+ minutes even though every test in it
 * passes — measured up to ~140s for otherwise-healthy batches. 210s gives
 * that headroom; a batch that exceeds it is genuinely hung, not just slow.
 */
const BATCH_TIMEOUT_MS = 210_000;

/**
 * `@mui/x-charts` vendors the full d3 ecosystem (d3-array, d3-scale,
 * d3-shape, ... — see @mui/x-charts-vendor) as ~250 small ESM files. Under
 * Node's loader + tsx's on-the-fly transform, importing it cold costs
 * ~120-165s by itself (measured), independent of anything the test does —
 * grouping even one such file into a normal 5-file batch reliably blows the
 * 120s BATCH_TIMEOUT_MS. These files are pulled into their own single-file
 * batches with a longer timeout instead of being penalized by (or
 * penalizing) unrelated files sharing their batch.
 */
const HEAVY_IMPORT_MARKERS = ["@mui/x-charts"];
const HEAVY_BATCH_TIMEOUT_MS = 240_000;

/**
 * Live-integration tests (`*.live.test.ts[x]`) talk to real services
 * (Firebase, Redis) and need real credentials, so they are excluded from the
 * default run and executed via `--live` instead — without jsdom, because
 * firebase-admin's token fetch breaks under a fake browser environment
 * ("fetchImpl is not a function") and its RTDB client then retries forever.
 */
const args = process.argv.slice(2);
const liveMode = args.includes("--live");
const filterArg = args.find((a) => a !== "--live");

const TSX_ARGS = [
  // Node's --import requires a bare specifier or a file:// URL — a raw
  // Windows path (C:\...) is parsed as a URL with scheme "c:" and rejected.
  "--import",
  pathToFileURL(join(__dirname, "test-loader-hooks.mjs")).href,
  ...(liveMode ? [] : ["--import", "global-jsdom/register"]),
  "--experimental-test-module-mocks",
  "--test-force-exit",
  "--test",
];

/** Recursively collect *.test.ts / *.test.tsx paths. */
async function collectTests(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...(await collectTests(full)));
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      if (/\.live\.test\.tsx?$/.test(entry.name) !== liveMode) continue;
      out.push(full);
    }
  }
  return out;
}

/** Split files into consecutive fixed-size batches. */
function batchFiles(files, size) {
  const batches = [];
  for (let i = 0; i < files.length; i += size) {
    batches.push(files.slice(i, i + size));
  }
  return batches;
}

/**
 * Partition files into normal batches plus one single-file batch per file
 * matching HEAVY_IMPORT_MARKERS, so a slow-to-import file never shares a
 * process (and its timeout) with unrelated files. Each batch is tagged with
 * the timeout it should run under.
 */
async function planBatches(files, size) {
  const heavy = [];
  const normal = [];
  await Promise.all(
    files.map(async (f) => {
      const source = await readFile(f, "utf8");
      (HEAVY_IMPORT_MARKERS.some((m) => source.includes(m))
        ? heavy
        : normal
      ).push(f);
    })
  );

  const batches = batchFiles(normal, size).map((batch) => ({
    files: batch,
    timeoutMs: BATCH_TIMEOUT_MS,
  }));
  for (const f of heavy) {
    batches.push({ files: [f], timeoutMs: HEAVY_BATCH_TIMEOUT_MS });
  }
  return batches;
}

/** Run one batch (a handful of files) in a single tsx process. */
function runBatch(files, index, timeoutMs) {
  return new Promise((resolve) => {
    // Spawn `node <tsx-cli> <flags> <files>` directly. No shell, no npx, so no
    // Windows .cmd quirks; env (loaded above) is inherited by the child.
    // `detached` puts the child in its own process group so the timeout can
    // kill the WHOLE tree. tsx re-execs node: killing only the direct child
    // leaves that grandchild alive holding the stdio pipes, which is why the
    // old close-based version could deadlock the pool on a hung test.
    const child = spawn(
      process.execPath,
      [TSX_CLI, ...TSX_ARGS, ...files],
      {
        cwd: ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
      }
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    const killTree = () => {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
      } else {
        try {
          process.kill(-child.pid, "SIGKILL"); // negative pid = process group
        } catch {
          child.kill("SIGKILL");
        }
      }
    };

    const timer = setTimeout(() => {
      killTree();
      stderr += `\n[run-tests] batch ${index} exceeded ${timeoutMs}ms and was killed.\n`;
    }, timeoutMs);

    // Normally resolve on `close` (all output flushed). But `close` waits for
    // the stdio pipes, which a surviving grandchild can hold open indefinitely
    // — so after `exit`, give the pipes a short grace period and then resolve
    // regardless, so one hung tree can never deadlock the worker pool.
    let settled = false;
    const settle = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ index, code: code ?? 1, stdout, stderr, files });
    };
    child.on("close", (code) => settle(code));
    child.on("exit", (code) => {
      setTimeout(() => settle(code), 2_000).unref();
    });
  });
}

/**
 * Sum `tests N / pass N / fail N` from a batch's output. node:test prints one
 * aggregate summary block per process, but we `matchAll` defensively so the
 * totals stay correct even if that ever changes.
 */
function parseCounts(output) {
  const sum = (label) => {
    const re = new RegExp(`ℹ ${label} (\\d+)`, "g");
    let total = 0;
    for (const m of output.matchAll(re)) total += Number(m[1]);
    return total;
  };
  return { tests: sum("tests"), pass: sum("pass"), fail: sum("fail") };
}

async function main() {
  let files = (
    await Promise.all(TEST_ROOTS.map((r) => collectTests(join(ROOT, r))))
  ).flat();

  if (filterArg) {
    const needle = filterArg.replaceAll("\\", "/");
    files = files.filter((f) =>
      relative(ROOT, f).replaceAll("\\", "/").includes(needle)
    );
  }

  if (files.length === 0) {
    console.error(
      filterArg
        ? `No test files matched "${filterArg}".`
        : "No test files found."
    );
    process.exit(1);
  }

  const batches = await planBatches(files, BATCH_SIZE);
  console.log(
    `Running ${files.length} test file(s) in ${batches.length} batch(es), ` +
      `${CONCURRENCY} at a time...\n`
  );

  const started = Date.now();
  const results = [];
  let cursor = 0;
  let done = 0;

  // Bounded worker pool over the batches, printing a one-line progress tick as
  // each batch finishes so a long run shows life instead of going silent.
  async function worker() {
    while (cursor < batches.length) {
      const i = cursor++;
      const { files: batchFilesList, timeoutMs } = batches[i];
      const r = await runBatch(batchFilesList, i, timeoutMs);
      results.push(r);
      done++;
      const counts = parseCounts(r.stdout + r.stderr);
      const mark = r.code === 0 && counts.fail === 0 ? "✔" : "✖";
      process.stdout.write(
        `  ${mark} batch ${done}/${batches.length} ` +
          `(${counts.pass}/${counts.tests} passed)\n`
      );
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker)
  );

  let totalTests = 0;
  let totalPass = 0;
  let totalFail = 0;
  const failedBatches = [];

  for (const r of results) {
    const counts = parseCounts(r.stdout + r.stderr);
    totalTests += counts.tests;
    totalPass += counts.pass;
    totalFail += counts.fail;
    if (r.code !== 0 || counts.fail > 0) {
      failedBatches.push(r);
    }
  }

  // Only dump full output for batches that failed — keeps the happy path quiet.
  for (const r of failedBatches) {
    console.log(`\n${"─".repeat(70)}`);
    console.log(`Batch ${r.index} FAILED (exit ${r.code}):`);
    for (const f of r.files) console.log(`  • ${relative(ROOT, f)}`);
    console.log("─".repeat(70));
    if (r.stdout.trim()) console.log(r.stdout.trim());
    if (r.stderr.trim()) console.error(r.stderr.trim());
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n${"═".repeat(70)}`);
  console.log(`Elapsed: ${elapsed}s`);
  console.log(
    `Totals: ${totalPass}/${totalTests} passed, ${totalFail} failed ` +
      `(${failedBatches.length} batch(es) with failures).`
  );
  console.log("═".repeat(70));

  process.exit(failedBatches.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
