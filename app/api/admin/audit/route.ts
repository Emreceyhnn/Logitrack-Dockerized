import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { platformAdminAction } from "@/app/lib/platform-admin";
import { listAuditLogs } from "@/app/lib/controllers/admin/data";
import { handleApiError } from "@/app/lib/api/handleApiError";
import { toValidationError } from "@/app/lib/api/zodIssues";
import type { AdminAuditFilters } from "@/app/lib/type/admin/data";

export const dynamic = "force-dynamic";

// Only GET is exported: the audit trail is append-only, so the console offers
// no route that could edit or delete a record.
const filtersSchema = z.object({
  action: z.string().max(64).default("ALL"),
  search: z.string().max(200).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const loadAudit = platformAdminAction(
  "audit.list",
  async (_user, filters: AdminAuditFilters) => listAuditLogs(filters)
);

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = filtersSchema.safeParse(params);
    if (!parsed.success) throw toValidationError(parsed.error);

    const data = await loadAudit(parsed.data as AdminAuditFilters);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return handleApiError("/api/admin/audit", error);
  }
}
