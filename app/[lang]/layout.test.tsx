 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// Mock utilities
mock.module("../lib/language/language.ts", {
  namedExports: {
    getDictionary: mock.fn(async () => ({ landing: { metaTitle: "LogiTrack" } }))
  }
});
mock.module("../lib/actions/theme.ts", {
  namedExports: { getUserTheme: mock.fn(async () => "dark") }
});
mock.module("../lib/auth-middleware.ts", {
  namedExports: { getAuthenticatedUser: mock.fn(async () => null) }
});

// Mock providers and components
mock.module("../lib/theme/themeProviders.tsx", { defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="theme-provider">{children}</div> });
mock.module("../lib/language/DictionaryContext.tsx", { namedExports: { DictionaryProvider: ({ children  }: Record<string, unknown>) => <div data-testid="dict-provider">{children}</div> } });
mock.module("../lib/context/UserContext.tsx", { namedExports: { UserProvider: ({ children  }: Record<string, unknown>) => <div data-testid="user-provider">{children}</div> } });
mock.module("@vercel/speed-insights/next", { namedExports: { SpeedInsights: () => <div data-testid="speed-insights" /> } });

describe("RootLayout Component", () => {
  let RootLayout: unknown;

  before(async () => {
    const mod = await import("./layout");
    RootLayout = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("RootLayout() Render Testleri", () => {
    it("should_RenderProvidersAndChildren_Correctly", async () => {
      // Act
      const element = await RootLayout({
        children: <div data-testid="child-content">Root Content</div>,
        params: Promise.resolve({ lang: "en" })
      });
      render(element);

      // Assert
      expect(screen.getByTestId("theme-provider")).toBeTruthy();
      expect(screen.getByTestId("dict-provider")).toBeTruthy();
      expect(screen.getByTestId("user-provider")).toBeTruthy();
      expect(screen.getByTestId("child-content")).toBeTruthy();
      expect(screen.getByTestId("speed-insights")).toBeTruthy();
    });
  });
});
