 
import { describe, it, before, mock } from "node:test";
import { expect } from "expect";
import { renderToString } from "react-dom/server";
import React from "react";
global.React = React;

// MOCKLAR
mock.module("@mui/material", {
  namedExports: {
    Card: ({ children  }: Record<string, unknown>) => <div data-testid="Card">{children}</div>,
    useTheme: mock.fn(() => ({
      palette: {
        mode: "light",
        background: { paper: "paper-color" },
        divider: "divider-color"
      }
    }))
  }
});

describe("CustomCard Component", () => {
  let CustomCard: unknown;

  before(async () => {
    const mod = await import("./card");
    CustomCard = mod.default;
  });

  describe("CustomCard() bileşeni", () => {
    it("should_RenderChildrenInsideCard", async () => {
      let error = null;
      let html = "";
      try {
        html = renderToString(<CustomCard><div>TestContent</div></CustomCard>);
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeNull();
      expect(html).toContain("data-testid=\"Card\"");
      expect(html).toContain("TestContent");
    });
  });
});
