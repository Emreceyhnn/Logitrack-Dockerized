import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { platformAdminAction } from "@/app/lib/platform-admin";
import { browseTable, BROWSABLE_MODELS } from "@/app/lib/controllers/admin/data";
import { handleApiError } from "@/app/lib/api/handleApiError";
import { toValidationError } from "@/app/lib/api/zodIssues";
import type { BrowsableModel } from "@/app/lib/type/admin/data";

export const dynamic = "force-dynamic";

// GET only — the database browser is read-only by design. There is no PUT,
// PATCH or DELETE here, so no admin action (or stolen admin session) can
// mutate customer records through this surface.
const querySchema = z.object({
  model: z.enum([
    "Company",
    "Vehicle",
    "Shipment",
    "Route",
    "Warehouse",
    "Customer",
    "Driver",
    "Inventory",
  ]),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const loadTable = platformAdminAction(
  "database.browse",
  async (_user, input: { model: BrowsableModel; page: number; pageSize: number }) =>
    browseTable(input.model, input.page, input.pageSize)
);

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) throw toValidationError(parsed.error);

    const snapshot = await loadTable(parsed.data);
    return NextResponse.json(
      { snapshot, models: BROWSABLE_MODELS },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return handleApiError("/api/admin/database", error);
  }
}
