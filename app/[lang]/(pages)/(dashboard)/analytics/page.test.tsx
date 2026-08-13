
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const mockGetAuthenticatedUser = mock.fn(async () => ({ id: "user-1" }));
const mockRedirect = mock.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

mock.module("@/app/lib/auth-middleware", {
  namedExports: { getAuthenticatedUser: mockGetAuthenticatedUser },
});

mock.module("next/navigation", {
  namedExports: { redirect: mockRedirect },
});

describe("AnalyticsPage Component", () => {
  let AnalyticsPage: unknown;

  before(async () => {
    const mod = await import("./page");
    AnalyticsPage = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockGetAuthenticatedUser.mock.resetCalls();
    mockRedirect.mock.resetCalls();
  });

  describe("AnalyticsPage() Render Testleri", () => {
    it("should_RenderComingSoon_WhenAuthenticated", async () => {
      const PageComponent = await (
        AnalyticsPage as (props: unknown) => Promise<React.ReactElement>
      )({ params: Promise.resolve({ lang: "en" }) });
      render(PageComponent);

      expect(screen.getByText("Coming Soon")).toBeTruthy();
    });

    it("should_Redirect_WhenNotAuthenticated", async () => {
      mockGetAuthenticatedUser.mock.mockImplementationOnce(async () => null);

      await expect(
        (AnalyticsPage as (props: unknown) => Promise<React.ReactElement>)({
          params: Promise.resolve({ lang: "en" }),
        })
      ).rejects.toThrow("REDIRECT:/en/auth/sign-in");
    });
  });
});
