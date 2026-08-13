import { NextResponse } from "next/server";
import { platformAdminAction } from "@/app/lib/platform-admin";
import { getQueueSnapshot } from "@/app/lib/controllers/admin/sandbox";
import { handleApiError } from "@/app/lib/api/handleApiError";

export const dynamic = "force-dynamic";

const loadSnapshot = platformAdminAction("sandbox.queueSnapshot", async () =>
  getQueueSnapshot()
);

export async function GET() {
  try {
    const snapshot = await loadSnapshot();
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return handleApiError("/api/admin/sandbox/queue", error);
  }
}
