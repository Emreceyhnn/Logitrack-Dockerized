import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { platformAdminAction } from "@/app/lib/platform-admin";
import {
  listDemoRequests,
  decideDemoRequest,
} from "@/app/lib/controllers/admin/demoRequests";
import { handleApiError } from "@/app/lib/api/handleApiError";
import { toValidationError } from "@/app/lib/api/zodIssues";

export const dynamic = "force-dynamic";

const statusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
const typeSchema = z.enum(["DEMO", "CONTACT"]);

const listSchema = z.object({
  status: statusSchema.optional(),
  type: typeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const decideSchema = z.object({
  id: z.string().min(1).max(64),
  status: statusSchema,
  // Bounds are re-checked in the controller; keeping them here too means a
  // malformed value is rejected before it reaches any write.
  trialDays: z.coerce.number().int().min(1).max(365).optional(),
});

const runList = platformAdminAction(
  "demoRequests.list",
  async (
    _admin,
    input: {
      status?: "PENDING" | "APPROVED" | "REJECTED" | undefined;
      type?: "DEMO" | "CONTACT" | undefined;
      limit: number;
    }
  ) => listDemoRequests(input)
);

const runDecide = platformAdminAction(
  "demoRequests.decide",
  async (
    admin,
    input: {
      id: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
      trialDays?: number | undefined;
    }
  ) => decideDemoRequest(admin.id, input)
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
    return handleApiError("/api/admin/demo-requests", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const json: unknown = await request.json().catch(() => null);
    const parsed = decideSchema.safeParse(json);
    if (!parsed.success) throw toValidationError(parsed.error);

    const result = await runDecide(parsed.data);
    return NextResponse.json(
      { result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return handleApiError("/api/admin/demo-requests", error);
  }
}
