import { getAuthenticatedUser } from "@/app/lib/auth-middleware";
import { notificationBus, type NotificationEvent } from "@/app/lib/notificationBus";

export const dynamic = "force-dynamic";

/**
 * NOTIFICATION EVENT STREAM
 * =========================
 * Replaces the Firebase RTDB listeners `useNotifications` used to hold open
 * (broadcast / personal inbox / company-wide / role-scoped) with a single SSE
 * connection per signed-in user. New rows are pushed here the moment
 * `sendNotificationAction` writes them (see app/lib/notificationBus.ts); the
 * signed-in user's notification history up to that point is a separate fetch
 * (`getNotificationsAction`) — this stream only carries what happens after it
 * opens.
 *
 * EventSource cannot set headers, so auth comes from the session cookie
 * directly rather than an Authorization header.
 */

const HEARTBEAT_MS = 25_000;
/** Forces a client reconnect periodically rather than holding one connection
 *  (and its listener on the process-wide EventEmitter) open indefinitely. */
const MAX_CONNECTION_MS = 30 * 60 * 1000;

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void) | undefined;

  // Collapses the four Firebase RTDB paths useNotifications used to
  // subscribe to (broadcast / personal / company / role) into one predicate:
  // global reaches everyone, a personal row only its owner, a company/role
  // row only members of that company (and, if set, that role).
  const matches = (evt: NotificationEvent): boolean => {
    if (evt.isGlobal) return true;
    if (evt.userId) return evt.userId === user.id;
    if (evt.companyId && evt.companyId !== user.companyId) return false;
    if (evt.roleId) return evt.roleId === user.roleId;
    return !!evt.companyId;
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      send("open", { at: new Date().toISOString() });

      unsubscribe = notificationBus.subscribe((evt) => {
        if (matches(evt)) send("notification", evt);
      });

      heartbeatTimer = setInterval(() => {
        send("heartbeat", { at: Date.now() });
      }, HEARTBEAT_MS);

      closeTimer = setTimeout(() => {
        send("close", { reason: "max duration reached" });
        controller.close();
      }, MAX_CONNECTION_MS);
    },
    cancel() {
      // Client disconnected — release the timers and the bus listener so
      // neither leaks past this connection's lifetime.
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (closeTimer) clearTimeout(closeTimer);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
