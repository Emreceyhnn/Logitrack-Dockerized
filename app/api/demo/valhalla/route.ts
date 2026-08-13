import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/rate-limiter";
import { logger } from "@/app/lib/logger";

// Public, unauthenticated routing proxy for the Live Demo. /api/valhalla
// requires a session (it is an internal proxy), which 401s for anonymous demo
// visitors and left every demo map without a drawn route. This mirrors that
// route's payload validation and body cap, but swaps the session check for a
// per-IP rate limit so the Valhalla backend still can't be abused anonymously.
const MAX_BODY_BYTES = 64 * 1024; // 64 KB

// Deliberately tight: a demo map draws a handful of routes per page view.
const DEMO_RATE_LIMIT = 30;
const DEMO_RATE_WINDOW_SECONDS = 60;

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const limitResult = await rateLimit(
    ip,
    DEMO_RATE_LIMIT,
    DEMO_RATE_WINDOW_SECONDS,
    "rate-limit:demo-valhalla:"
  );
  if (!limitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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
        {
          error:
            "Invalid routing request: 'locations' (>=2) and 'costing' are required",
        },
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
    logger.error("[Demo Valhalla API] Rota hesaplanamadı:", error);
    return new NextResponse(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
