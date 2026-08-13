import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { platformAdminAction } from "@/app/lib/platform-admin";
import {
  listUsers,
  setUserStatus,
  revokeUserSessions,
} from "@/app/lib/controllers/admin/data";
import { handleApiError } from "@/app/lib/api/handleApiError";
import { toValidationError } from "@/app/lib/api/zodIssues";
import type { AdminUserFilters } from "@/app/lib/type/admin/data";

export const dynamic = "force-dynamic";

const filtersSchema = z.object({
  search: z.string().max(200).default(""),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"]).default("ALL"),
  companyId: z.string().max(64).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setStatus"),
    userId: z.string().min(1).max(64),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  }),
  z.object({
    action: z.literal("revokeSessions"),
    userId: z.string().min(1).max(64),
  }),
]);

const loadUsers = platformAdminAction(
  "users.list",
  async (_user, filters: AdminUserFilters) => listUsers(filters)
);

const mutateUser = platformAdminAction(
  "users.mutate",
  async (admin, input: z.infer<typeof mutationSchema>) => {
    if (input.action === "setStatus") {
      // The acting admin's id is passed so the controller can refuse a
      // self-lockout.
      return setUserStatus(admin.id, input.userId, input.status);
    }
    await revokeUserSessions(input.userId);
    return { ok: true };
  }
);

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = filtersSchema.safeParse(params);
    if (!parsed.success) throw toValidationError(parsed.error);

    const data = await loadUsers(parsed.data as AdminUserFilters);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return handleApiError("/api/admin/users", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const json: unknown = await request.json().catch(() => null);
    const parsed = mutationSchema.safeParse(json);
    if (!parsed.success) throw toValidationError(parsed.error);

    const result = await mutateUser(parsed.data);
    return NextResponse.json(
      { result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return handleApiError("/api/admin/users", error);
  }
}
