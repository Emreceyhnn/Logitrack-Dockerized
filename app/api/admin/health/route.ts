import { NextResponse } from "next/server";
import { platformAdminAction } from "@/app/lib/platform-admin";
import { getHealthMatrix } from "@/app/lib/controllers/admin/health";
import { handleApiError } from "@/app/lib/api/handleApiError";

// Probes live dependencies on every call, so a cached response would be
// actively misleading.
export const dynamic = "force-dynamic";

const loadHealth = platformAdminAction("health.matrix", async () => {
  return getHealthMatrix();
});

export async function GET() {
  try {
    const services = await loadHealth();
    return NextResponse.json(
      { services },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return handleApiError("/api/admin/health", error);
  }
}
