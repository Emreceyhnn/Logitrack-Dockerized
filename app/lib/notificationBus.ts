import { EventEmitter } from "events";
import type {
  NotificationType,
  NotificationCategory,
} from "@/app/lib/type/notification";

export interface NotificationEvent {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory | null;
  link: string | null;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: number;
  userId: string | null;
  companyId: string | null;
  roleId: string | null;
  isGlobal: boolean;
}

const EVENT_NAME = "notification";

class NotificationBus extends EventEmitter {
  publish(event: NotificationEvent) {
    this.emit(EVENT_NAME, event);
  }

  subscribe(listener: (event: NotificationEvent) => void): () => void {
    this.on(EVENT_NAME, listener);
    return () => this.off(EVENT_NAME, listener);
  }
}

// Same globalThis-caching pattern as app/lib/db.ts: without it, dev-mode hot
// reload replaces this module (and the emitter instance with it) on every
// edit, silently dropping every open SSE connection's listener.
const globalForBus = globalThis as typeof globalThis & {
  notificationBus?: NotificationBus;
};

const bus = globalForBus.notificationBus ?? new NotificationBus();
if (!globalForBus.notificationBus) {
  // Each open SSE connection registers one listener — a single-VPS instance
  // can have far more than EventEmitter's default cap of 10 without it being
  // a leak, so the warning is disabled rather than raising the limit blindly.
  bus.setMaxListeners(0);
}
if (process.env.NODE_ENV !== "production") globalForBus.notificationBus = bus;

export const notificationBus = bus;
