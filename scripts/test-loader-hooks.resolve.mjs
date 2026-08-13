// Loader-thread half of scripts/test-loader-hooks.mjs — must live in its own
// module because node:module#register() loads hooks on a separate thread.
const SERVER_ONLY_STUB = new URL(
  "./test-server-only-stub.mjs",
  import.meta.url
).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: SERVER_ONLY_STUB, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
