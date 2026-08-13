import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { platformAdminAction } from "@/app/lib/platform-admin";
import { sendTestEmail } from "@/app/lib/controllers/admin/sandbox";
import { handleApiError } from "@/app/lib/api/handleApiError";
import { toValidationError } from "@/app/lib/api/zodIssues";
import type { EmailTestPayload } from "@/app/lib/type/admin/sandbox";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  to: z.string().min(3).max(320),
  template: z.enum([
    "verification",
    "passwordReset",
    "companyWelcome",
    "securityAlert",
    "notification",
    "custom",
  ]),
  lang: z.enum(["en", "tr"]).default("en"),
  subject: z.string().max(300).optional(),
  html: z.string().max(200_000).optional(),
});

// This sends REAL mail, so the operation name is explicit in the audit trail.
const runSend = platformAdminAction(
  "sandbox.sendTestEmail",
  async (_user, payload: EmailTestPayload) => sendTestEmail(payload)
);

export async function POST(request: NextRequest) {
  try {
    const json: unknown = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      throw toValidationError(parsed.error);
    }

    const result = await runSend(parsed.data as EmailTestPayload);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return handleApiError("/api/admin/sandbox/email", error);
  }
}
