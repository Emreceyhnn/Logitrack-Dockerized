 
import { describe, it, before, mock } from "node:test";
import { expect } from "expect";
import { renderToString } from "react-dom/server";
import React from "react";
global.React = React;

// MOCKLAR
mock.module("../../lib/language/language.ts", { 
  namedExports: { 
    getDictionary: mock.fn(async () => ({ 
      common: { logitrack: "LogiTrack" },
      footer: { 
        description: "Desc", product: "Prod", features: "Feat", pricing: "Price", roadmap: "Road",
        company: "Comp", about: "Abt", blog: "Blog", careers: "Car",
        legal: "Legal", privacyPolicy: "Priv", termsOfService: "Terms",
        rights: "Rights", builtFor: "Built"
      }
    })) 
  } 
});

mock.module("@mui/material", {
  namedExports: {
    Box: ({ children  }: Record<string, unknown>) => <div data-testid="Box">{children}</div>,
    Stack: ({ children  }: Record<string, unknown>) => <div data-testid="Stack">{children}</div>,
    Typography: ({ children  }: Record<string, unknown>) => <div data-testid="Typography">{children}</div>,
    Divider: () => <hr data-testid="Divider" />
  }
});

describe("Footer Component", () => {
  let Footer: unknown;

  before(async () => {
    const mod = await import("./index");
    Footer = mod.default;
  });

  describe("Footer() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", async () => {
      let error = null;
      let html = "";
      try {
        const element = await Footer({ params: Promise.resolve({ lang: "en" }) });
        html = renderToString(element);
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeNull();
      expect(html).toContain("data-testid=\"Box\"");
      expect(html).toContain("LogiTrack");
    });
  });
});
