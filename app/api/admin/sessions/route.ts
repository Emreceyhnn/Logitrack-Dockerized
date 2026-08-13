import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { platformAdminAction } from "@/app/lib/platform-admin";
import { listSessions, killSession } from "@/app/lib/controllers/admin/data";
import { handleApiError } from "@/app/lib/api/handleApiError";
import { toValidationError } from "@/app/lib/api/zodIssues";

export const dynamic = "force-dynamic";

const killSchema = z.object({ sessionId: z.string().min(1).max(64) });

const loadSessions = platformAdminAction("sessions.list", async () =>
  listSessions()
);

const revoke = platformAdminAction(
  "sessions.revoke",
  async (_admin, sessionId: string) => {
    await killSession(sessionId);
    return { ok: true };
  }
);

export async function GET() {
  try {
    const rows = await loadSessions();
    return NextResponse.json(
      { rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return handleApiError("/api/admin/sessions", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const json: unknown = await request.json().catch(() => null);
    const parsed = killSchema.safeParse(json);
    if (!parsed.success) throw toValidationError(parsed.error);

    const result = await revoke(parsed.data.sessionId);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return handleApiError("/api/admin/sessions", error);
  }
}
