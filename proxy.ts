import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  AUTH_ROUTES,
  COMPANY_REQUIRED_ROUTES,
  PROTECTED_ROUTES,
  DEFAULT_REDIRECT_AFTER_LOGIN,
  LOCALES,
  DEFAULT_LOCALE,
  SIGN_IN_ROUTE,
  Locale,
} from "@/app/lib/constants";
import {
  buildLocalizedHref,
  getCanonicalPath,
} from "@/app/lib/language/navigation";
import { rateLimit } from "@/app/lib/rate-limiter";
import { hasAccess, type AccessStatus } from "@/app/lib/entitlement";
import { redis } from "@/app/lib/redis";

/* -------------------------------------------------------------------------- */
/*  Startup Validations                                                         */
/* -------------------------------------------------------------------------- */

if (!process.env.JWT_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET environment variable is missing. Application cannot start safely.");
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function getClientIp(request: NextRequest): string {
  // Trust order for Next.js / Vercel environments (request.ip was removed
  // from NextRequest in Next 15, so we read it from trusted proxy headers):
  // 1. x-vercel-forwarded-for - Vercel specific secure header
  // 2. x-real-ip - Reliable if overwritten by a trusted proxy
  // 3. LAST hop of x-forwarded-for (fallback, but can be spoofed)
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const firstVercelIp = vercelIp.split(",")[0];
    if (firstVercelIp) return firstVercelIp.trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1] ?? "unknown";
  }

  return "unknown";
}

// Edge-safe SHA-256 hex, matching the node `hashToken` used server-side so the
// hashes line up on the same Redis revocation denylist keys. We can't import the
// session helpers here — that module pulls in node `crypto`/`jose` internals that
// don't belong in the edge bundle — so the hashing is reproduced with Web Crypto.
async function hashTokenEdge(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Mirror of session/internal.ts `revokedTokenKey`. Kept in sync manually rather
// than imported, for the same edge-bundle reason as hashTokenEdge above.
const revokedTokenKeyEdge = (tokenHash: string): string =>
  `revoked:token:${tokenHash}`;

// Mirror of session/internal.ts `staleClaimsKey`, same edge-bundle reason.
const staleClaimsKeyEdge = (userId: string): string => `stale:claims:${userId}`;

function getLocaleFromPathname(pathname: string): {
  locale: Locale;
  restPath: string;
} {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (LOCALES.includes(first as Locale)) {
    const rest = "/" + segments.slice(1).join("/");
    return {
      locale: first as Locale,
      restPath: rest === "/" ? "" : rest,
    };
  }

  return { locale: DEFAULT_LOCALE, restPath: pathname };
}

// Dashboard responses get a strict per-request nonce on script-src: every
// script tag in that subtree (JsonLd is landing-only, MUI/emotion styles are
// untouched since style-src stays relaxed) must carry it via `x-nonce`.
// Marketing/static routes keep the relaxed script-src so the root [lang]
// layout can stay free of headers()/cookies() (see layout.tsx) and remain
// statically rendered.
function buildCsp(nonce: string, strict: boolean): string {
  // Vercel auto-injects these on deployments: static.cloudflareinsights.com is
  // the Web Analytics beacon, vercel.live is the preview/toolbar feedback
  // widget. Neither is loaded by our own code, but Vercel adds them outside
  // our control, so they need an allowlist entry or every page load throws a
  // CSP violation.
  const thirdPartyScripts =
    "https://static.cloudflareinsights.com https://vercel.live";
  const scriptSrc = strict
    ? `'self' 'nonce-${nonce}' https://maps.googleapis.com https://accounts.google.com/gsi/client ${thirdPartyScripts}`
    : `'self' 'unsafe-inline' https://maps.googleapis.com https://accounts.google.com/gsi/client ${thirdPartyScripts}`;

  return [
    `script-src ${scriptSrc}`,
    // Google Identity Services renders the button/One Tap prompt in its own
    // iframe and posts back via this origin — without it the GSI script loads
    // but the sign-in UI never mounts.
    "frame-src https://accounts.google.com https://res.cloudinary.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/* -------------------------------------------------------------------------- */
/*  Proxy (Next.js 16+ proxy/middleware convention)                             */
/* -------------------------------------------------------------------------- */

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = crypto.randomUUID().replace(/-/g, "");

  // ── Rate Limiting for API Routes ───────────────────────────────────────────
  if (pathname.startsWith("/api")) {
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
    const isAuth = pathname.startsWith("/api/auth");
    
    // Optimizasyon: Kritik olmayan GET isteklerinde Redis ağ gecikmesini (+50-100ms) 
    // önlemek için Rate Limiter sadece mutasyon ve yetkilendirme rotalarında çalıştırılır.
    if (isMutation || isAuth) {
      const ip = getClientIp(request);
      const limitResult = await rateLimit(ip, 120, 60, "rate-limit:api:");

      if (!limitResult.success) {
        return new NextResponse(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": limitResult.limit.toString(),
              "X-RateLimit-Remaining": limitResult.remaining.toString(),
              "X-RateLimit-Reset": limitResult.reset.toString(),
            },
          }
        );
      }
    }
  }

  // Skip Next.js internals, static files, API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    /\.(.+)$/.test(pathname)
  ) {
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", buildCsp(nonce, false));
    return response;
  }

  // ── 1. Locale redirect ─────────────────────────────────────────────────────
  const hasLocalePrefix = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );

  if (!hasLocalePrefix) {
    const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
    let locale = DEFAULT_LOCALE;

    if (cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)) {
      locale = cookieLocale as Locale;
    } else {
      const acceptLanguage = request.headers.get("accept-language");
      if (acceptLanguage) {
        // 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7' -> pick the first matching language
        const preferredLang = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase() ?? "";
        if ((LOCALES as readonly string[]).includes(preferredLang)) {
          locale = preferredLang as Locale;
        }
      }
    }

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const { locale, restPath } = getLocaleFromPathname(pathname);
  const currentLocalePath = restPath || "/";
  
  // ── 2. Determine Canonical Path for Auth Checks and Rewrites ──────────────
  const canonicalPath =
    locale !== "en" ? getCanonicalPath(currentLocalePath, locale) : currentLocalePath;

  let rewriteUrl: URL | null = null;
  if (locale !== "en" && canonicalPath !== currentLocalePath) {
    rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${locale}${canonicalPath}`;
  }

  // ── 3. Auth gate ────────────────────────────────────────────────────────────
  const token = request.cookies.get("token")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  
  // Use canonicalPath for route matching!
  const currentPath = canonicalPath;

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (p) => currentPath === p || currentPath.startsWith(p + "/")
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (p) => currentPath === p || currentPath.startsWith(p + "/")
  );
  const isCompanyRequired = COMPANY_REQUIRED_ROUTES.some(
    (p) => currentPath === p || currentPath.startsWith(p + "/")
  );

  // Unauthenticated access to protected page → redirect to sign-in
  if (isProtectedRoute && !token && !refreshToken) {
    const url = request.nextUrl.clone();
    url.pathname = buildLocalizedHref(SIGN_IN_ROUTE, locale);
    return NextResponse.redirect(url);
  }

  // Validate JWT
  let companyId: string | null = null;
  let isTokenValid = false;
  let accessStatus: AccessStatus | null = null;
  let trialEndsAt: number | null = null;
  let userId: string | null = null;

  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET as string);
      const { payload } = await jwtVerify(token, secret);
      companyId = (payload.companyId as string) || null;
      userId = typeof payload.id === "string" ? payload.id : null;
      accessStatus = (payload.accessStatus as AccessStatus) ?? null;
      trialEndsAt =
        typeof payload.trialEndsAt === "number" ? payload.trialEndsAt : null;
      isTokenValid = true;
    } catch {
      // jwtVerify throws errors.JWTExpired if expired, or other errors if invalid
      isTokenValid = false;
    }
  }

  // A cryptographically-valid JWT can still be revoked (logout, admin removed
  // the user / deactivated the account) before it expires. Server Components
  // reject it via the same Redis denylist (getAuthenticatedUser), but the edge
  // trusted it — so a removed user's still-valid token bounced between the
  // dashboard (rejects → /auth/sign-in) and the proxy (sign-in + valid token →
  // back to the dashboard), an infinite redirect loop that tripped the rate
  // limiter ("too many requests"). Treat a denylisted token as invalid so the
  // refresh flow below fires: refreshSession fails for a revoked session and
  // clears the cookies, landing the user cleanly on sign-in. One Redis GET,
  // only when a valid token is actually present (anonymous requests skip it).
  if (isTokenValid && token) {
    try {
      const revoked = await redis.get(revokedTokenKeyEdge(await hashTokenEdge(token)));
      if (revoked) {
        isTokenValid = false;
        companyId = null;
        accessStatus = null;
        trialEndsAt = null;
      }
    } catch {
      // Fail-open on a Redis blip: the token is still signature-valid and
      // short-lived, matching getAuthenticatedUser's fail-open posture.
    }
  }

  // A signature-valid token can still carry STALE claims: when an admin adds an
  // existing user to a company (addCompanyUser) or they accept an invitation,
  // their `companyId` changes in the DB while their cookie keeps saying null.
  // Nothing on the hot path re-reads it — both this proxy and
  // getAuthenticatedUser decode companyId straight from the JWT — so without
  // this the user is stranded on /onboarding until the token expires, and any
  // Server Action they trigger runs under a null tenant context. The flag is
  // set by invalidateUserSessionCache and cleared by refreshSession once the
  // JWT is re-minted from current DB state.
  // `refreshed=1` marks a request that just came back from /api/auth/refresh.
  // If the flag somehow survived (a Redis del that failed), honouring it again
  // would bounce the user between here and the refresh route forever — so we
  // trust the fresh token for this hop and let the next request re-evaluate.
  const justRefreshed = request.nextUrl.searchParams.get("refreshed") === "1";

  let hasStaleClaims = false;
  if (isTokenValid && userId && !justRefreshed) {
    try {
      hasStaleClaims = Boolean(await redis.get(staleClaimsKeyEdge(userId)));
    } catch {
      // Fail-open, same posture as the revocation check above: a Redis blip
      // must not bounce everyone through the refresh endpoint.
    }
  }

  // Effective dashboard entitlement, decided purely from the JWT summary.
  const userHasAccess = hasAccess(accessStatus, trialEndsAt);

  // ── 4. Token Refresh Flow ───────────────────────────────────────────────────
  // If the access token is invalid/expired — or still valid but holding stale
  // claims — and a refresh token exists, redirect to the refresh endpoint
  // before hitting any Server Components.
  // Auth routes are excluded on purpose. Sign-in is where a FAILED refresh
  // lands the user, so routing it back through /api/auth/refresh closes a
  // cycle: refresh fails → sign-in → proxy sees the still-present refresh
  // cookie → refresh again. The user never sees the form, just a hanging tab.
  // On an auth route we let the page render and the cookie be cleared there.
  if ((!isTokenValid || hasStaleClaims) && refreshToken && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = `/api/auth/refresh`;
    url.searchParams.set(
      "redirect_to",
      request.nextUrl.pathname + request.nextUrl.search
    );
    return NextResponse.redirect(url);
  }

  // "No access" splits by *why*: a lapsed trial/plan (EXPIRED) sees pricing
  // with an upgrade notice. A brand-new user without access (NONE) is NOT
  // stuck waiting anymore — they still belong on /onboarding, where the
  // "join an existing company" path stays open to everyone; only the
  // "create a company" card is gated (client-side, backed by createCompany's
  // own hasAccess check) behind a live trial/plan.
  const noAccessHome: { pathname: string; search: string } =
    accessStatus === "NONE"
      ? { pathname: buildLocalizedHref("/onboarding", locale), search: "" }
      : { pathname: buildLocalizedHref("/pricing", locale), search: "?reason=expired" };

  // Where an authenticated user belongs:
  //   - has company           → dashboard
  //   - no company, EXPIRED   → pricing (they had access and lost it)
  //   - no company, otherwise → onboarding (create-or-join a company; NONE
  //     users can still join, just not create)
  const authedHome: { pathname: string; search: string } = companyId
    ? { pathname: buildLocalizedHref(DEFAULT_REDIRECT_AFTER_LOGIN, locale), search: "" }
    : accessStatus === "EXPIRED"
      ? noAccessHome
      : { pathname: buildLocalizedHref("/onboarding", locale), search: "" };

  const isOnboarding =
    currentPath === "/onboarding" || currentPath.startsWith("/onboarding/");

  // Already authenticated on auth routes → send them to their home.
  if (isAuthRoute && isTokenValid) {
    const url = request.nextUrl.clone();
    url.pathname = authedHome.pathname;
    url.search = authedHome.search;
    return NextResponse.redirect(url);
  }

  // Onboarding only requires being signed in with no company yet — access
  // level decides which card is clickable client-side, not whether the page
  // is reachable at all. An EXPIRED user (had access, lost it) still gets
  // sent to pricing instead, same as everywhere else.
  if (isOnboarding && isTokenValid && accessStatus === "EXPIRED") {
    const url = request.nextUrl.clone();
    url.pathname = noAccessHome.pathname;
    url.search = noAccessHome.search;
    return NextResponse.redirect(url);
  }

  // Company-required routes enforcement
  if (isCompanyRequired) {
    if (!isTokenValid && !refreshToken) {
      const url = request.nextUrl.clone();
      url.pathname = buildLocalizedHref(SIGN_IN_ROUTE, locale);
      return NextResponse.redirect(url);
    }

    // Signed in but no dashboard access → pending-access (NONE) or pricing
    // (EXPIRED trial / no plan). The dashboard itself still requires real
    // access — only /onboarding's "join" path is available without it.
    if (isTokenValid && !userHasAccess) {
      const url = request.nextUrl.clone();
      url.pathname = noAccessHome.pathname;
      url.search = noAccessHome.search;
      return NextResponse.redirect(url);
    }

    // Has access but no company yet → onboarding to create one.
    if (isTokenValid && !companyId) {
      const url = request.nextUrl.clone();
      url.pathname = buildLocalizedHref("/onboarding", locale);
      return NextResponse.redirect(url);
    }
  }

  // ── 5. Root Path Redirect ───────────────────────────────────────────────────
  // Authenticated users skip the marketing page; anonymous visitors (and
  // crawlers) must reach the landing page, so no redirect for them.
  // Exception: If an explicit landing parameter (?landing=true or ?home=true) is present,
  // allow reaching the landing page even when authenticated.
  const isExplicitLanding =
    request.nextUrl.searchParams.get("landing") === "true" ||
    request.nextUrl.searchParams.get("home") === "true";

  if (currentPath === "/" && isTokenValid && !isExplicitLanding) {
    const url = request.nextUrl.clone();
    url.pathname = authedHome.pathname;
    url.search = authedHome.search;
    return NextResponse.redirect(url);
  }

  // ── 6. Final Response ───────────────────────────────────────────────────────
  const csp = buildCsp(nonce, isProtectedRoute);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js reads the nonce for its own inline scripts (bootstrap/flight
  // payload) from the REQUEST's Content-Security-Policy header — without this,
  // a strict script-src would block them and protected pages would not hydrate.
  requestHeaders.set("content-security-policy", csp);

  const response = rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

/* -------------------------------------------------------------------------- */
/*  Matcher                                                                     */
/* -------------------------------------------------------------------------- */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)",
  ],
};
