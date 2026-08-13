"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  db,
  ref,
  onValue,
  off,
  type DataSnapshot,
  type DatabaseReference,
} from "@/app/lib/firebase";
import { ensureFirebaseAuth } from "@/app/lib/firebase-auth";
import { NotificationType } from "@/app/lib/type/notification";
import { logger } from "@/app/lib/logger";
import {
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
  _sourcePath?: string;
}

interface UserContext {
  id: string;
  companyId?: string | null;
  roleId?: string | null;
}

export const useNotifications = (user: UserContext | undefined) => {
  const [notificationMap, setNotificationMap] = useState<
    Record<string, Notification>
  >({});
  const [loading, setLoading] = useState(true);
  const [prevUserId, setPrevUserId] = useState(user?.id);
  // IDs with an optimistic delete in flight. The RTDB listener still fires
  // mid-delete with the pre-delete snapshot (Firebase resync, sibling write,
  // etc.); without this guard that snapshot resurrects the row a moment
  // after the optimistic removal, then it vanishes again once the real
  // delete commits — the "gidiyor geri geliyor" flicker.
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

    const paths = [
      { key: "everybody", path: "notifications/broadcast" },
      { key: "personal", path: `notifications/inbox/${user.id}` },
      ...(user.companyId
        ? [
            {
              key: "company",
              path: `notifications/company/${user.companyId}/all`,
            },
          ]
        : []),
      ...(user.companyId && user.roleId
        ? [
            {
              key: "role",
              path: `notifications/company/${user.companyId}/role/${user.roleId}`,
            },
          ]
        : []),
    ];

    const listeners: Array<{
      nodeRef: DatabaseReference;
      listener: (snap: DataSnapshot) => void;
      path: string;
    }> = [];

    setLoading(true);
    let pathsLoaded = 0;
    let cancelled = false;

    // RTDB security rules require an authenticated Firebase session scoped to
    // the caller's companyId. Sign in before subscribing; if the effect is torn
    // down first, `cancelled` prevents a late subscription.
    void ensureFirebaseAuth()
      .then(() => {
        if (cancelled) return;
        subscribeAll();
      })
      .catch((err) => {
        logger.error("[useNotifications] Firebase auth failed:", err);
        if (!cancelled) setLoading(false);
      });

    function subscribeAll() {
    paths.forEach(({ path }) => {
      const nodeRef = ref(db, path);
      const listener = (snapshot: DataSnapshot) => {
        const data = snapshot.val() as Record<
          string,
          Omit<Notification, "id">
        > | null;

        setNotificationMap((prev) => {
          const next = { ...prev };

          Object.keys(next).forEach((id) => {
            if (next[id]?._sourcePath === path && !pendingDeletesRef.current.has(id)) {
              delete next[id];
            }
          });

          if (data) {
            Object.entries(data).forEach(([id, val]) => {
              if (pendingDeletesRef.current.has(id)) return;
              next[id] = { ...val, id, _sourcePath: path } as Notification;
            });
          }
          return next;
        });

        if (pathsLoaded < paths.length) {
          pathsLoaded++;
          if (pathsLoaded === paths.length) setLoading(false);
        }
      };

      onValue(nodeRef, listener, (err) => {
        logger.error(`Subscription error on [${path}]:`, err);
        if (pathsLoaded < paths.length) {
          pathsLoaded++;
          if (pathsLoaded === paths.length) setLoading(false);
        }
      });

      listeners.push({ nodeRef, listener, path });
    });
    }

    return () => {
      cancelled = true;
      listeners.forEach(({ nodeRef, listener }) =>
        off(nodeRef, "value", listener)
      );
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
      if (!user?.id || !notification._sourcePath) return;
      const wasRead = notification.isRead;
      // Optimistic: flip isRead immediately — the RTDB listener will confirm
      // (or, on failure below, we roll back) rather than waiting on the round trip.
      setNotificationMap((prev) => {
        const current = prev[notification.id];
        return current ? { ...prev, [notification.id]: { ...current, isRead: true } } : prev;
      });
      try {
        const res = await markAsReadAction(notification._sourcePath, notification.id);
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
    const targets = notifications.filter((n) => !n.isRead && n._sourcePath);
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
        targets.map((n) => markAsReadAction(n._sourcePath!, n.id))
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
      if (!user?.id || !notification._sourcePath) return;
      const previous = notification;
      // Optimistic: remove from the list immediately, restore on failure.
      // The id stays in pendingDeletesRef until the server call settles so an
      // in-flight RTDB snapshot (still showing the pre-delete data) can't
      // resurrect it in the meantime.
      pendingDeletesRef.current.add(notification.id);
      setNotificationMap((prev) => {
        const next = { ...prev };
        delete next[notification.id];
        return next;
      });
      try {
        const res = await deleteNotificationAction(
          notification._sourcePath,
          notification.id
        );
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
