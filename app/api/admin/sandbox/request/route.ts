import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { platformAdminAction } from "@/app/lib/platform-admin";
import { executeApiRequest } from "@/app/lib/controllers/admin/sandbox";
import { handleApiError } from "@/app/lib/api/handleApiError";
import { toValidationError } from "@/app/lib/api/zodIssues";
import type { ApiRequestPayload } from "@/app/lib/type/admin/sandbox";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  // Shape only — `assertSafeApiPath` in the controller is the real SSRF gate.
  path: z.string().min(1).max(2048),
  headers: z.record(z.string(), z.string()).default({}),
  query: z.record(z.string(), z.string()).default({}),
  body: z.string().max(1_000_000).optional(),
});

const runRequest = platformAdminAction(
  "sandbox.apiRequest",
  async (_user, payload: ApiRequestPayload) => executeApiRequest(payload)
);

export async function POST(request: NextRequest) {
  try {
    const json: unknown = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      throw toValidationError(parsed.error);
    }

    const result = await runRequest(parsed.data as ApiRequestPayload);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return handleApiError("/api/admin/sandbox/request", error);
  }
}
