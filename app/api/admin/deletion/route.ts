import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { platformAdminAction } from "@/app/lib/platform-admin";
import {
  softDeleteRecord,
  restoreRecord,
  hardDeleteUser,
  listDeletedRecords,
  type DeletableEntity,
} from "@/app/lib/controllers/admin/deletion";
import { handleApiError } from "@/app/lib/api/handleApiError";
import { toValidationError } from "@/app/lib/api/zodIssues";

export const dynamic = "force-dynamic";

const entitySchema = z.enum([
  "user",
  "company",
  "vehicle",
  "trailer",
  "shipment",
  "route",
  "warehouse",
  "customer",
  "driver",
  "inventory",
]);

const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("delete"),
    entity: entitySchema,
    id: z.string().min(1).max(64),
    /**
     * Typed confirmation. Required for companies, where a mis-click hides an
     * entire tenant and every one of its users. The client must echo the
     * record's own label back, so the destructive action cannot be triggered
     * by a stray Enter key.
     */
    confirmLabel: z.string().max(200).optional(),
  }),
  z.object({
    action: z.literal("restore"),
    entity: entitySchema,
    id: z.string().min(1).max(64),
  }),
  z.object({
    action: z.literal("hardDeleteUser"),
    id: z.string().min(1).max(64),
  }),
]);

const listSchema = z.object({
  entity: entitySchema,
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const runDelete = platformAdminAction(
  "deletion.softDelete",
  async (
    admin,
    input: {
      entity: DeletableEntity;
      id: string;
      confirmLabel?: string | undefined;
    }
  ) =>
    // The typed-confirmation check happens inside softDeleteRecord, before the
    // write — deleting first and rolling back on mismatch would briefly take a
    // live tenant offline for a request that was never authorised.
    softDeleteRecord(admin, input.entity, input.id, input.confirmLabel)
);

const runRestore = platformAdminAction(
  "deletion.restore",
  async (admin, input: { entity: DeletableEntity; id: string }) =>
    restoreRecord(admin, input.entity, input.id)
);

const runHardDeleteUser = platformAdminAction(
  "deletion.hardDeleteUser",
  async (admin, input: { id: string }) => hardDeleteUser(admin, input.id)
);

const runList = platformAdminAction(
  "deletion.listDeleted",
  async (_admin, input: { entity: DeletableEntity; limit: number }) =>
    listDeletedRecords(input.entity, input.limit)
);

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = listSchema.safeParse(params);
    if (!parsed.success) throw toValidationError(parsed.error);

    const rows = await runList(parsed.data);
    return NextResponse.json(
      { rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return handleApiError("/api/admin/deletion", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const json: unknown = await request.json().catch(() => null);
    const parsed = mutationSchema.safeParse(json);
    if (!parsed.success) throw toValidationError(parsed.error);

    const result =
      parsed.data.action === "delete"
        ? await runDelete(parsed.data)
        : parsed.data.action === "restore"
          ? await runRestore(parsed.data)
          : await runHardDeleteUser(parsed.data);

    return NextResponse.json(
      { result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return handleApiError("/api/admin/deletion", error);
  }
}
