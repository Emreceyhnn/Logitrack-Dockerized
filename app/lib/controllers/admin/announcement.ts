import "server-only";

import { redis } from "@/app/lib/redis";
import { logger } from "@/app/lib/logger";
import { ValidationError } from "@/app/lib/errors";

/**
 * PLATFORM ANNOUNCEMENTS
 * ======================
 * A single banner broadcast to every signed-in user, stored in Redis so it
 * takes effect without a deploy. Callers must have passed
 * `platformAdminAction`.
 */

const ANNOUNCEMENT_KEY = "platform:announcement";

export type AnnouncementSeverity = "info" | "warning" | "critical";

export interface Announcement {
  active: boolean;
  message: string;
  severity: AnnouncementSeverity;
  updatedAt: string | null;
  /** Who published it, for the audit trail. */
  updatedBy: string | null;
}

const EMPTY: Announcement = {
  active: false,
  message: "",
  severity: "info",
  updatedAt: null,
  updatedBy: null,
};

/** Hard cap: the banner is one line in a page header, not a document. */
const MAX_MESSAGE_LENGTH = 280;

/**
 * tr-Yayındaki duyuruyu okur.
 * en-Reads the current announcement. A Redis failure yields the inactive
 *    default rather than throwing: failing to read a banner must never take
 *    down the page that renders it.
 * input ()
 * output (Promise<Announcement>)
 */
export async function getAnnouncement(): Promise<Announcement> {
  try {
    const stored = await redis.get<Announcement>(ANNOUNCEMENT_KEY);
    return stored ?? EMPTY;
  } catch (error) {
    logger.error("[admin/announcement] read failed", error);
    return EMPTY;
  }
}

/**
 * tr-Duyuruyu yayınlar veya kaldırır.
 * en-Publishes or clears the announcement banner.
 *
 *    The message is stored as plain text and must be rendered as text by the
 *    client — never via dangerouslySetInnerHTML. An admin-authored banner shown
 *    to every user would otherwise be a stored-XSS vector reaching the entire
 *    platform.
 * input (adminId: string, input: { active, message, severity })
 * output (Promise<Announcement>)
 */
export async function setAnnouncement(
  adminId: string,
  input: { active: boolean; message: string; severity: AnnouncementSeverity }
): Promise<Announcement> {
  const message = input.message.trim();

  if (input.active && !message) {
    throw new ValidationError("An active announcement needs a message", {
      message: ["Message is required"],
    });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ValidationError(
      `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
      { message: [`Maximum ${MAX_MESSAGE_LENGTH} characters`] }
    );
  }

  const announcement: Announcement = {
    active: input.active,
    message,
    severity: input.severity,
    updatedAt: new Date().toISOString(),
    updatedBy: adminId,
  };

  // No TTL: a banner must stay up until it is explicitly taken down.
  await redis.set(ANNOUNCEMENT_KEY, announcement);

  logger.info(
    `[admin/announcement] ${input.active ? "published" : "cleared"} by ${adminId}`
  );

  return announcement;
}
