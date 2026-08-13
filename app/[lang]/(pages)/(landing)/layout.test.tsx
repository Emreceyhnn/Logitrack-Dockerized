 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// Mock Child Components. The layout also renders LandingFooter and
// LandingThemeProvider, which consume useDictionary; stub them so the layout
// is self-contained.
mock.module("../../../components/landing/LandingNavbar.tsx", {
  defaultExport: () => <div data-testid="landing-navbar">Landing Navbar</div>,
});
mock.module("../../../components/landing/LandingFooter.tsx", {
  defaultExport: () => <div data-testid="landing-footer">Landing Footer</div>,
});
mock.module("../../../lib/theme/LandingThemeProvider.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <>{children}</>,
});
mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: {
    useDictionary: mock.fn(() => ({})),
    useLanguage: mock.fn(() => ({ lang: "en" })),
  },
});
mock.module("../../../lib/language/language.ts", {
  namedExports: {
    getDictionary: mock.fn(async () => ({ landing: { metaDescription: "desc" } })),
  },
});
mock.module("../../../components/seo/JsonLd.tsx", {
  defaultExport: () => <script data-testid="json-ld" />,
});

describe("LandingLayout Component", () => {
  let LandingLayout: unknown;

  before(async () => {
    const mod = await import("./layout");
    LandingLayout = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("LandingLayout() Render Testleri", () => {
    it("should_RenderNavbarAndChildren_Correctly", async () => {
      // Act
      const element = await (LandingLayout as (props: unknown) => Promise<React.ReactElement>)({
        children: <div data-testid="child-content">Landing Content</div>,
        params: Promise.resolve({ lang: "en" }),
      });
      render(element);

      // Assert
      expect(screen.getByTestId("landing-navbar")).toBeTruthy();
      expect(screen.getByTestId("child-content")).toBeTruthy();
      expect(screen.getByTestId("json-ld")).toBeTruthy();
    });
  });
});
