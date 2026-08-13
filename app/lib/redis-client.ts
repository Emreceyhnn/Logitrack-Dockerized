import { createClient, type RedisClientType } from "redis";
import { logger } from "@/app/lib/logger";

/**
 * tr-Upstash REST istemcisinin yerine geçen, kendi sunucumuzda çalışan Redis
 * (RESP protokolü) için uyumluluk katmanı.
 * en-Compatibility layer over self-hosted Redis (RESP) that preserves the
 * `@upstash/redis` surface this codebase was written against.
 *
 * Only the operations the app actually uses are implemented: get, set (with
 * nx/ex), del, incr, expire, sadd, smembers, scan, eval, ping and pipeline.
 *
 * Two Upstash behaviours are reproduced deliberately, because call sites depend
 * on them:
 *  1. Values are JSON-serialised on write and parsed on read, so callers can
 *     store and retrieve plain objects (`redis.get<StoredFlag>(...)`).
 *  2. `pipeline().exec()` resolves to a FLAT array of reply values
 *     (node-redis would otherwise hand back its own multi result shape).
 *     rate-limiter.ts reads `results[0]` as a number and would break.
 */

const url = process.env.REDIS_URL || "redis://localhost:6379";

// A single client is shared across the process. In dev, Next's module reloading
// would otherwise open a new connection on every recompile until Redis refuses
// them, so the instance is cached on globalThis (same pattern as PrismaClient).
const globalForRedis = globalThis as unknown as {
  __redisClient?: RedisClientType;
};

function createRedisClient(): RedisClientType {
  const client: RedisClientType = createClient({
    url,
    socket: {
      // Without a bounded strategy node-redis retries forever with growing
      // backoff and every command queues up behind it. Cap the delay so a
      // restarted Redis is picked back up quickly.
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  // An 'error' listener is mandatory: node-redis emits connection errors on the
  // client, and an unhandled 'error' event would crash the Node process.
  client.on("error", (err) => {
    logger.error("Redis client error:", err);
  });

  void client.connect().catch((err) => {
    logger.error("Redis initial connection failed:", err);
  });

  return client;
}

const client: RedisClientType =
  globalForRedis.__redisClient ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.__redisClient = client;
}

/**
 * tr-Değeri saklamak için serileştirir.
 * en-Serialises a value for storage, matching Upstash's automatic handling.
 */
function serialise(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * tr-Saklanan değeri geri çözer.
 * en-Parses a stored value back. Non-JSON payloads (plain strings written by
 * other producers) are returned as-is rather than throwing.
 */
function deserialise<T>(value: string | null): T | null {
  if (value === null) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

interface SetOptions {
  nx?: boolean;
  ex?: number;
}

/**
 * tr-Upstash `set` seçeneklerini node-redis biçimine çevirir.
 * en-Translates Upstash set options to node-redis argument form.
 */
function toSetArgs(opts?: SetOptions) {
  const args: { NX?: true; EX?: number } = {};
  if (opts?.nx) args.NX = true;
  if (opts?.ex !== undefined) args.EX = opts.ex;
  return args;
}

type PipelineOp = () => Promise<unknown>;

class Pipeline {
  private ops: PipelineOp[] = [];

  set(key: string, value: unknown, opts?: SetOptions) {
    this.ops.push(() => client.set(key, serialise(value), toSetArgs(opts)));
    return this;
  }

  get(key: string) {
    this.ops.push(() => client.get(key));
    return this;
  }

  del(key: string) {
    this.ops.push(() => client.del(key));
    return this;
  }

  incr(key: string) {
    this.ops.push(() => client.incr(key));
    return this;
  }

  expire(key: string, seconds: number) {
    this.ops.push(() => client.expire(key, seconds));
    return this;
  }

  sadd(key: string, member: string) {
    this.ops.push(() => client.sAdd(key, member));
    return this;
  }

  /**
   * Runs the queued commands and resolves to a flat array of their replies,
   * matching what `@upstash/redis` returns.
   */
  async exec(): Promise<unknown[]> {
    // Issued in the same tick, so node-redis batches them onto the wire as one
    // pipeline. Promise.all preserves command order in the results array.
    return Promise.all(this.ops.map((op) => op()));
  }
}

export const redis = {
  async get<T>(key: string): Promise<T | null> {
    return deserialise<T>(await client.get(key));
  },

  async set(
    key: string,
    value: unknown,
    opts?: SetOptions
  ): Promise<"OK" | null> {
    const result = await client.set(key, serialise(value), toSetArgs(opts));
    // With NX, node-redis resolves to null when the key already existed.
    // withCache() compares against "OK" to decide whether it holds the lock.
    return result === null ? null : "OK";
  },

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return client.del(keys);
  },

  async incr(key: string): Promise<number> {
    return client.incr(key);
  },

  async expire(key: string, seconds: number): Promise<number> {
    const ok = await client.expire(key, seconds);
    return ok ? 1 : 0;
  },

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return client.sAdd(key, members);
  },

  async smembers<T = string[]>(key: string): Promise<T> {
    return client.sMembers(key) as unknown as T;
  },

  /**
   * Mirrors Upstash's cursor-and-options signature and its
   * `[cursor, keys]` tuple return.
   */
  async scan(
    cursor: number,
    opts?: { match?: string; count?: number }
  ): Promise<[number, string[]]> {
    // Built conditionally rather than with `MATCH: opts?.match`: the project
    // enables exactOptionalPropertyTypes, which rejects an explicit undefined.
    const scanOptions: { MATCH?: string; COUNT?: number } = {};
    if (opts?.match !== undefined) scanOptions.MATCH = opts.match;
    if (opts?.count !== undefined) scanOptions.COUNT = opts.count;

    // node-redis takes the cursor as a RedisArgument (string); callers of this
    // wrapper pass and expect a number, as Upstash's client did.
    const reply = await client.scan(String(cursor), scanOptions);
    return [Number(reply.cursor), reply.keys];
  },

  /**
   * Upstash takes (script, keys[], args[]); node-redis wants them named.
   */
  async eval(
    script: string,
    keys: string[] = [],
    args: string[] = []
  ): Promise<unknown> {
    return client.eval(script, { keys, arguments: args });
  },

  async ping(): Promise<string> {
    return client.ping();
  },

  pipeline(): Pipeline {
    return new Pipeline();
  },
};

export type { Pipeline };
