import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth-middleware";

import { logger } from "@/app/lib/logger";

// Cap the proxied body so this endpoint can't be used to tunnel large payloads
// to the routing backend.
const MAX_BODY_BYTES = 64 * 1024; // 64 KB

export async function POST(request: NextRequest) {
  // 1. Require an authenticated session — this is an internal routing proxy,
  //    not a public endpoint. Prevents anonymous abuse of the Valhalla backend.
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // API URL comes from env; the destination is fixed server-side so the client
  // can never redirect this request elsewhere (no SSRF).
  const apiUrl =
    process.env.NEXT_PUBLIC_VALHALLA_API_URL || "http://63.176.164.179:8080";
  const url = `${apiUrl}/route`;

  try {
    const body = await request.text();

    if (body.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 }
      );
    }

    // 2. Validate the payload shape before forwarding — reject anything that is
    //    not a well-formed Valhalla routing request.
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const req = parsed as { locations?: unknown; costing?: unknown };
    if (
      !req ||
      typeof req !== "object" ||
      !Array.isArray(req.locations) ||
      req.locations.length < 2 ||
      typeof req.costing !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid routing request: 'locations' (>=2) and 'costing' are required" },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(30_000),
    });

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error: unknown) {
    logger.error("[Valhalla API] Rota hesaplanamadı:", error);
    return new NextResponse(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
