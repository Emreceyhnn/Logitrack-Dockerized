import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { logger } from "@/app/lib/logger";
import { timingSafeEqual } from "@/app/lib/utils/timingSafeEqual";
import { runAsSystem } from "@/app/lib/tenant-context";
import { sendSubscriptionEmail } from "@/app/lib/services/email";

// Outbound email is throttled to stay under the provider's 10 req/s limit, so a
// large fan-out takes real wall-clock time. The default 10s budget would cut the
// job off mid-batch and silently drop every remaining recipient.
export const maxDuration = 300;

/**
 * Subscription lifecycle notifications.
 *
 * Runs daily and emails users whose trial is about to lapse or has just
 * lapsed. Two properties matter here:
 *
 *   1. Idempotence. The job runs every day, so "trial ends within 3 days"
 *      would match the same user three days running and mail them three
 *      times. Instead each reminder targets an exact remaining-day count
 *      (3 and 1), which a given subscription can satisfy only once.
 *
 *   2. Self-healing status. A TRIAL row whose trialEndsAt has passed is still
 *      stored as TRIAL — resolveEntitlement derives EXPIRED at read time but
 *      never writes it back. This job persists that transition, which both
 *      makes the state queryable and guarantees the "ended" mail goes out
 *      exactly once (the row is no longer TRIAL afterwards).
 */

/** Days-remaining thresholds that trigger a warning email. */
const REMINDER_DAYS = [3, 1] as const;

/**
 * tr-Verilen gün sayısı için o güne denk gelen tarih aralığını (gün başı–gün sonu) döndürür.
 * en-Returns the [start, end) window of the calendar day that falls `days` days from now.
 * input (days: number)
 * output ({ start: Date; end: Date })
 */
function dayWindowFromNow(days: number): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(start.getDate() + days);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    !authHeader ||
    !timingSafeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Scans every tenant's subscriptions to fan out lifecycle mail, so it runs
    // in a trusted system context (see runAsSystem / db.ts).
    return await runAsSystem(async () => {
      const now = new Date();
      let remindersSent = 0;
      let expiredSent = 0;

      // ─── 1. Trials approaching their end ──────────────────────────────
      for (const days of REMINDER_DAYS) {
        const { start, end } = dayWindowFromNow(days);

        const ending = await db.subscription.findMany({
          where: {
            status: "TRIAL",
            trialEndsAt: { gte: start, lt: end },
          },
          select: {
            id: true,
            plan: true,
            user: { select: { email: true, name: true, language: true } },
          },
        });

        for (const sub of ending) {
          if (!sub.user?.email) continue;

          const sent = await sendSubscriptionEmail(
            {
              email: sub.user.email,
              lang: sub.user.language === "tr" ? "tr" : "en",
            },
            {
              kind: "TRIAL_ENDING",
              userName: sub.user.name,
              daysRemaining: days,
              ...(sub.plan ? { planName: sub.plan } : {}),
            }
          );

          if (sent) remindersSent++;
        }
      }

      // ─── 2. Trials that have now lapsed ───────────────────────────────
      const lapsed = await db.subscription.findMany({
        where: {
          status: "TRIAL",
          trialEndsAt: { lt: now },
        },
        select: {
          id: true,
          plan: true,
          user: { select: { email: true, name: true, language: true } },
        },
      });

      for (const sub of lapsed) {
        // tr-Durumu önce yaz: e-posta başarısız olsa bile satır TRIAL kalmamalı, aksi halde
        //    iş her gün aynı kaydı yeniden işler ve kullanıcıya tekrar tekrar mail gider.
        // en-Persist the status first: even if the email fails the row must leave TRIAL,
        //    otherwise tomorrow's run reprocesses it and mails the user all over again.
        await db.subscription.update({
          where: { id: sub.id },
          data: { status: "EXPIRED" },
        });

        if (!sub.user?.email) continue;

        const sent = await sendSubscriptionEmail(
          {
            email: sub.user.email,
            lang: sub.user.language === "tr" ? "tr" : "en",
          },
          {
            kind: "TRIAL_ENDED",
            userName: sub.user.name,
            ...(sub.plan ? { planName: sub.plan } : {}),
          }
        );

        if (sent) expiredSent++;
      }

      logger.info(
        `[cron/subscription-lifecycle] Sent ${remindersSent} trial reminder(s) and ` +
          `${expiredSent} expiry notice(s); ${lapsed.length} subscription(s) moved to EXPIRED.`
      );

      return NextResponse.json({
        success: true,
        remindersSent,
        expiredSent,
        markedExpired: lapsed.length,
      });
    });
  } catch (error) {
    logger.error("[cron/subscription-lifecycle] Failed:", error);
    return NextResponse.json(
      { error: "Failed to process subscription lifecycle" },
      { status: 500 }
    );
  }
}
