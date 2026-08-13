 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

const mockNextResponse = {
  json: mock.fn((body: unknown, init?: { status?: number }) => ({
    _body: body,
    _status: init?.status ?? 200,
  })),
  redirect: mock.fn((url: Record<string, unknown>) => ({
    _redirect: url.toString(),
    _status: 302,
    cookies: { delete: mock.fn(), set: mock.fn() },
  })),
};
mock.module("next/server", {
  namedExports: { NextResponse: mockNextResponse, NextRequest: class {} },
});

const refreshSessionMock = mock.fn();
mock.module("../../../lib/controllers/session.ts", {
  namedExports: { refreshSession: refreshSessionMock },
});

mock.module("../../../lib/constants.ts", {
  namedExports: { DEFAULT_LOCALE: "en", SIGN_IN_ROUTE: "/sign-in" },
});

mock.module("../../../lib/language/navigation.ts", {
  namedExports: { buildLocalizedHref: (route: string, locale: string) => `/${locale}${route}` },
});

function makeRequest(redirectTo = "/dashboard") {
  const sp = new URLSearchParams({ redirect_to: redirectTo });
  return {
    nextUrl: {
      searchParams: sp,
      clone: () => {
        // Return a mutable url-like object whose toString reflects changes
        const state = { pathname: "/", search: "" };
        return new Proxy(state, {
          set(target, key, value) {
            (target as unknown)[key] = value;
            return true;
          },
          get(target, key) {
            if (key === "toString") return () => `http://localhost${target.pathname}${target.search}`;
            if (key === "origin") return "http://localhost";
            return (target as unknown)[key];
          },
        });
      },
      origin: "http://localhost",
    },
  } as unknown;
}

describe("GET /api/auth/refresh", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    refreshSessionMock.mock.resetCalls();
    mockNextResponse.redirect.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_RedirectToTarget_WhenSessionRefreshSucceeds", async () => {
    refreshSessionMock.mock.mockImplementationOnce(async () => true);
    const res: unknown = await GET(makeRequest("/dashboard"));
    expect(mockNextResponse.redirect.mock.calls.length).toBe(1);
    expect(res._status).toBe(302);
    expect(res._redirect).toBe("http://localhost/dashboard");
  });

  it("should_StayOnOrigin_WhenRedirectToIsAbsoluteExternalUrl", async () => {
    refreshSessionMock.mock.mockImplementationOnce(async () => true);
    const res: unknown = await GET(makeRequest("https://evil.com/phish"));
    expect(mockNextResponse.redirect.mock.calls.length).toBe(1);
    const target = new URL(res._redirect);
    expect(target.origin).toBe("http://localhost");
    expect(target.pathname).toBe("/");
  });

  it("should_StayOnOrigin_WhenRedirectToIsProtocolRelative", async () => {
    refreshSessionMock.mock.mockImplementationOnce(async () => true);
    const res: unknown = await GET(makeRequest("//evil.com/phish"));
    const target = new URL(res._redirect);
    expect(target.origin).toBe("http://localhost");
    expect(target.pathname).toBe("/");
  });

  it("should_StayOnOrigin_WhenRedirectToUsesBackslashTrick", async () => {
    refreshSessionMock.mock.mockImplementationOnce(async () => true);
    const res: unknown = await GET(makeRequest("/\\evil.com"));
    const target = new URL(res._redirect);
    expect(target.origin).toBe("http://localhost");
  });

  it("should_RedirectToSignIn_WhenSessionRefreshFails", async () => {
    refreshSessionMock.mock.mockImplementationOnce(async () => false);
    const res: unknown = await GET(makeRequest("/en/dashboard"));
    expect(mockNextResponse.redirect.mock.calls.length).toBe(1);
    // URL should point to sign-in
    const redirectUrl: string = res._redirect;
    expect(redirectUrl).toContain("sign-in");
  });
});
