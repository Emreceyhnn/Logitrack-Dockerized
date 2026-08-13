import { getPlatformAdmin } from "@/app/lib/platform-admin";

export const dynamic = "force-dynamic";

/**
 * SANDBOX EVENT STREAM
 * ====================
 * A real Server-Sent Events endpoint the WebSocket/SSE tester can connect to.
 * It emits a heartbeat carrying live server state (uptime, memory, timestamp)
 * so the tester proves an actual streaming connection rather than replaying a
 * canned transcript.
 *
 * EventSource cannot set headers, so this handler authenticates from the
 * session cookie directly instead of going through `platformAdminAction`. It
 * is read-only and emits no tenant data, so there is no cross-tenant access to
 * guard — but it still refuses anyone who is not a platform admin.
 */

const HEARTBEAT_MS = 2_000;
/** Hard cap so an abandoned tab cannot hold a serverless function open. */
const MAX_EVENTS = 150;

export async function GET() {
  const admin = await getPlatformAdmin();
  if (!admin) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let counter = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          )
        );
      };

      send("open", {
        message: "Sandbox stream connected",
        at: new Date().toISOString(),
      });

      timer = setInterval(() => {
        counter++;

        if (counter > MAX_EVENTS) {
          send("close", { reason: "max events reached", count: counter - 1 });
          if (timer) clearInterval(timer);
          controller.close();
          return;
        }

        const memory = process.memoryUsage();
        send("heartbeat", {
          seq: counter,
          at: new Date().toISOString(),
          uptimeSeconds: Math.round(process.uptime()),
          rssMb: Math.round(memory.rss / 1024 / 1024),
          heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        });
      }, HEARTBEAT_MS);
    },
    cancel() {
      // Client disconnected — stop the timer so the interval does not leak.
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      // Disable proxy buffering so events arrive as they are emitted.
      "X-Accel-Buffering": "no",
    },
  });
}
