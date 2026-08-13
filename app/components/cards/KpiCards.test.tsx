 
import { describe, it, before, mock } from "node:test";
import { expect } from "expect";
import { renderToString } from "react-dom/server";
import React from "react";
global.React = React;

// MOCKLAR
mock.module("framer-motion", {
  namedExports: {
    motion: { div: ({ children  }: Record<string, unknown>) => <div data-testid="MotionDiv">{children}</div> }
  }
});

mock.module("../cards/StatCard.tsx", { defaultExport: () => <div data-testid="StatCard" /> });

// KpiCards now uses useRouter to navigate on tile drill-down.
mock.module("next/navigation", {
  namedExports: { useRouter: () => ({ push: () => {} }) },
});

mock.module("@/app/lib/language/DictionaryContext", {
  namedExports: {
    useLanguage: () => ({ lang: "en", dict: {}, changeLanguage: () => {} }),
  },
});

mock.module("@mui/material", {
  namedExports: {
    Box: ({ children  }: Record<string, unknown>) => <div data-testid="Box">{children}</div>,
    Card: ({ children  }: Record<string, unknown>) => <div data-testid="Card">{children}</div>,
    Skeleton: () => <div data-testid="Skeleton" />,
    Stack: ({ children  }: Record<string, unknown>) => <div data-testid="Stack">{children}</div>,
    useTheme: mock.fn(() => ({
      palette: {
        background: { paper_alpha: { main_80: "" } },
        divider: "",
        divider_alpha: { main_10: "" },
        common: { black_alpha: { main_20: "" } }
      }
    }))
  }
});

describe("KpiCards Component", () => {
  let KpiCards: unknown;

  before(async () => {
    const mod = await import("./KpiCards");
    KpiCards = mod.default;
  });

  const mockKpis = [{ label: "KPI 1", value: 100, icon: <span />, color: "red" }];

  describe("KpiCards() bileşeni", () => {
    it("should_RenderStatCards_WhenNotLoading", async () => {
      let error = null;
      let html = "";
      try {
        html = renderToString(<KpiCards kpis={mockKpis} loading={false} />);
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeNull();
      expect(html).toContain("data-testid=\"StatCard\"");
    });

    it("should_RenderSkeletons_WhenLoading", async () => {
      let error = null;
      let html = "";
      try {
        html = renderToString(<KpiCards kpis={mockKpis} loading={true} />);
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeNull();
      expect(html).toContain("data-testid=\"Skeleton\"");
    });
  });
});
