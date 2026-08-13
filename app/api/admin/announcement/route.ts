import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { platformAdminAction } from "@/app/lib/platform-admin";
import {
  getAnnouncement,
  setAnnouncement,
  type AnnouncementSeverity,
} from "@/app/lib/controllers/admin/announcement";
import { handleApiError } from "@/app/lib/api/handleApiError";
import { toValidationError } from "@/app/lib/api/zodIssues";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  active: z.boolean(),
  message: z.string().max(280).default(""),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
});

const loadAnnouncement = platformAdminAction("announcement.read", async () =>
  getAnnouncement()
);

const publishAnnouncement = platformAdminAction(
  "announcement.publish",
  async (
    admin,
    input: { active: boolean; message: string; severity: AnnouncementSeverity }
  ) => setAnnouncement(admin.id, input)
);

export async function GET() {
  try {
    const announcement = await loadAnnouncement();
    return NextResponse.json(
      { announcement },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return handleApiError("/api/admin/announcement", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const json: unknown = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) throw toValidationError(parsed.error);

    const announcement = await publishAnnouncement(parsed.data);
    return NextResponse.json(
      { announcement },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return handleApiError("/api/admin/announcement", error);
  }
}
