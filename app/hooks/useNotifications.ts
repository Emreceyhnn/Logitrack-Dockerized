"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { NotificationType } from "@/app/lib/type/notification";
import { logger } from "@/app/lib/logger";
import {
  getNotificationsAction,
  markAsReadAction,
  deleteNotificationAction,
} from "@/app/lib/actions/notifications";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: number;
  isRead: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
}

interface UserContext {
  id: string;
  companyId?: string | null;
  roleId?: string | null;
}

/** Shape pushed by the SSE stream — see app/lib/notificationBus.ts. */
interface NotificationStreamEvent {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: number;
}

function toClientNotification(evt: NotificationStreamEvent): Notification {
  return {
    id: evt.id,
    title: evt.title,
    message: evt.message,
    type: evt.type,
    createdAt: evt.createdAt,
    isRead: evt.isRead,
    ...(evt.link ? { link: evt.link } : {}),
    ...(evt.metadata ? { metadata: evt.metadata } : {}),
  };
}

export const useNotifications = (user: UserContext | undefined) => {
  const [notificationMap, setNotificationMap] = useState<
    Record<string, Notification>
  >({});
  const [loading, setLoading] = useState(true);
  const [prevUserId, setPrevUserId] = useState(user?.id);
  // IDs with an optimistic delete in flight. The SSE stream can still emit a
  // stale event for an id being deleted (a duplicate publish, a reconnect
  // replaying a recent event); without this guard that event resurrects the
  // row a moment after the optimistic removal.
  const pendingDeletesRef = useRef<Set<string>>(new Set());

  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id);
    if (!user?.id) {
      setNotificationMap({});
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    setLoading(true);

    // Backfill history first — the SSE stream below only carries events
    // published after it connects, never what already exists.
    void getNotificationsAction().then((res) => {
      if (cancelled) return;
      if (res.success) {
        const map: Record<string, Notification> = {};
        res.notifications.forEach((n) => {
          map[n.id] = n as Notification;
        });
        setNotificationMap(map);
      } else {
        logger.error("[useNotifications] Failed to load history:", res.error);
      }
      setLoading(false);
    });

    const eventSource = new EventSource("/api/notifications/stream");

    eventSource.addEventListener("notification", (e) => {
      const evt = JSON.parse(
        (e as MessageEvent<string>).data
      ) as NotificationStreamEvent;
      if (pendingDeletesRef.current.has(evt.id)) return;
      setNotificationMap((prev) => ({
        ...prev,
        [evt.id]: toClientNotification(evt),
      }));
    });

    eventSource.onerror = (err) => {
      // EventSource retries connecting on its own; this is purely
      // diagnostic — no manual reconnect logic is needed.
      logger.error("[useNotifications] SSE connection error:", err);
    };

    return () => {
      cancelled = true;
      eventSource.close();
    };
  }, [user?.id, user?.companyId, user?.roleId]);

  const notifications = useMemo(() => {
    return Object.values(notificationMap).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }, [notificationMap]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const markAsRead = useCallback(
    async (notification: Notification) => {
      if (!user?.id) return;
      const wasRead = notification.isRead;
      // Optimistic: flip isRead immediately — roll back below on failure.
      setNotificationMap((prev) => {
        const current = prev[notification.id];
        return current ? { ...prev, [notification.id]: { ...current, isRead: true } } : prev;
      });
      try {
        const res = await markAsReadAction(notification.id);
        if (!res.success) throw new Error(res.error);
      } catch (err) {
        logger.error("Mark read failed:", err);
        setNotificationMap((prev) => {
          const current = prev[notification.id];
          return current ? { ...prev, [notification.id]: { ...current, isRead: wasRead } } : prev;
        });
      }
    },
    [user?.id]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.id || notifications.length === 0) return;
    const targets = notifications.filter((n) => !n.isRead);
    if (targets.length === 0) return;

    const patchIsRead = (
      map: Record<string, Notification>,
      ids: string[],
      isRead: boolean
    ) => {
      const next = { ...map };
      ids.forEach((id) => {
        const current = next[id];
        if (current) next[id] = { ...current, isRead };
      });
      return next;
    };

    setNotificationMap((prev) => patchIsRead(prev, targets.map((n) => n.id), true));

    try {
      const results = await Promise.all(
        targets.map((n) => markAsReadAction(n.id))
      );
      const failedIds = targets
        .filter((_, i) => !results[i]?.success)
        .map((n) => n.id);
      if (failedIds.length > 0) {
        setNotificationMap((prev) => patchIsRead(prev, failedIds, false));
      }
    } catch (err) {
      logger.error("Mark all read failed:", err);
      setNotificationMap((prev) => patchIsRead(prev, targets.map((n) => n.id), false));
    }
  }, [user?.id, notifications]);

  const deleteNotification = useCallback(
    async (notification: Notification) => {
      if (!user?.id) return;
      const previous = notification;
      // Optimistic: remove from the list immediately, restore on failure.
      // The id stays in pendingDeletesRef until the server call settles so a
      // stray SSE event for it can't resurrect it in the meantime.
      pendingDeletesRef.current.add(notification.id);
      setNotificationMap((prev) => {
        const next = { ...prev };
        delete next[notification.id];
        return next;
      });
      try {
        const res = await deleteNotificationAction(notification.id);
        if (!res.success) throw new Error(res.error);
      } catch (err) {
        logger.error("Delete failed:", err);
        setNotificationMap((prev) => ({ ...prev, [previous.id]: previous }));
      } finally {
        pendingDeletesRef.current.delete(notification.id);
      }
    },
    [user?.id]
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
