import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { platformAdminAction } from "@/app/lib/platform-admin";
import {
  listEnvEntries,
  listFeatureFlags,
  setFeatureFlag,
} from "@/app/lib/controllers/admin/settings";
import { handleApiError } from "@/app/lib/api/handleApiError";
import { toValidationError } from "@/app/lib/api/zodIssues";

export const dynamic = "force-dynamic";

const flagSchema = z.object({
  key: z.string().min(1).max(64),
  enabled: z.boolean(),
});

const loadSettings = platformAdminAction("settings.read", async () => {
  const [flags, env] = await Promise.all([
    listFeatureFlags(),
    // Synchronous, but wrapped so both resolve together.
    Promise.resolve(listEnvEntries()),
  ]);
  return { flags, env };
});

const toggleFlag = platformAdminAction(
  "settings.setFlag",
  async (_admin, input: { key: string; enabled: boolean }) =>
    setFeatureFlag(input.key, input.enabled)
);

export async function GET() {
  try {
    const data = await loadSettings();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return handleApiError("/api/admin/settings", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const json: unknown = await request.json().catch(() => null);
    const parsed = flagSchema.safeParse(json);
    if (!parsed.success) throw toValidationError(parsed.error);

    const flag = await toggleFlag(parsed.data);
    return NextResponse.json(
      { flag },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return handleApiError("/api/admin/settings", error);
  }
}
