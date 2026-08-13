import { NextRequest, NextResponse } from "next/server";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import "dayjs/locale/en";
import { db } from "@/app/lib/db";
import { logger } from "@/app/lib/logger";
import { timingSafeEqual } from "@/app/lib/utils/timingSafeEqual";
import { runAsSystem } from "@/app/lib/tenant-context";

// Outbound email is throttled to stay under the provider's 10 req/s limit, so a
// large fan-out takes real wall-clock time. The default 10s budget would cut the
// job off mid-batch and silently drop every remaining recipient.
export const maxDuration = 300;
import { getWeeklyReportStats } from "@/app/lib/controllers/reports/weeklyReport";
import { sendWeeklyReportEmail } from "@/app/lib/services/email";

function formatWeekLabel(since: Date, until: Date, lang: "en" | "tr"): string {
  const start = dayjs(since).locale(lang);
  const end = dayjs(until).locale(lang);
  if (start.isSame(end, "month")) {
    return `${start.format("D")}-${end.format("D MMMM YYYY")}`;
  }
  return `${start.format("D MMMM")} - ${end.format("D MMMM YYYY")}`;
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
    return await runAsSystem(async () => {
      const now = new Date();
      const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const companies = await db.company.findMany({ select: { id: true, name: true } });

      let emailsSent = 0;

      for (const company of companies) {
        const recipients = await db.user.findMany({
          where: { companyId: company.id, notifEmailWeekly: true },
          select: { email: true, language: true },
        });

        if (recipients.length === 0) continue;

        const stats = await getWeeklyReportStats(company.id, since);

        const byLang = new Map<"en" | "tr", string[]>();
        for (const r of recipients) {
          const lang: "en" | "tr" = r.language === "tr" ? "tr" : "en";
          const list = byLang.get(lang) ?? [];
          list.push(r.email);
          byLang.set(lang, list);
        }

        for (const [lang, emails] of byLang) {
          await sendWeeklyReportEmail(
            emails.map((email) => ({ email, lang })),
            {
              companyName: company.name,
              weekLabel: formatWeekLabel(since, now, lang),
              stats,
            }
          );
          emailsSent += emails.length;
        }
      }

      return NextResponse.json({ success: true, companiesChecked: companies.length, emailsSent });
    });
  } catch (error) {
    logger.error("Cron weekly-report failed:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
