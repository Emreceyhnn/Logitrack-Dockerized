// Registers an ESM resolve hook for the test suite (loaded via `--import`).
//
// `server-only` is a marker package: Next.js's webpack/turbopack config
// aliases it to a no-op so it can be imported by server-side modules (route
// handlers, controllers, entitlement resolvers) while still throwing if a
// bundler ever pulls it into a client bundle. Outside Next's bundler — i.e.
// under plain Node/tsx, which is how this suite runs — there is no such
// alias, so `import "server-only"` either fails to resolve (package not
// installed) or, once installed, throws unconditionally (its real
// implementation). Tests never bundle for the client, so the client/server
// boundary it enforces isn't a concern here; this hook reproduces the same
// no-op alias Next's bundler applies, scoped to the test run only.
import { register } from "node:module";

register("./test-loader-hooks.resolve.mjs", import.meta.url);
