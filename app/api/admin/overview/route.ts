import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { platformAdminAction } from "@/app/lib/platform-admin";
import { getAdminOverview } from "@/app/lib/controllers/admin/overview";
import { handleApiError } from "@/app/lib/api/handleApiError";
import { toValidationError } from "@/app/lib/api/zodIssues";
import type { AdminTimeRange } from "@/app/lib/type/admin/overview";

// Aggregates live rows on every call.
export const dynamic = "force-dynamic";

// Validated at the boundary: `range` indexes into a config map and is
// interpolated into date math, so an unchecked value must never get through.
const rangeSchema = z.enum(["1h", "24h", "7d", "30d"]).default("24h");

const loadOverview = platformAdminAction(
  "overview.metrics",
  async (_user, range: AdminTimeRange) => getAdminOverview(range)
);

export async function GET(request: NextRequest) {
  try {
    const parsed = rangeSchema.safeParse(
      request.nextUrl.searchParams.get("range") ?? undefined
    );
    if (!parsed.success) {
      throw toValidationError(parsed.error);
    }

    const data = await loadOverview(parsed.data);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return handleApiError("/api/admin/overview", error);
  }
}
