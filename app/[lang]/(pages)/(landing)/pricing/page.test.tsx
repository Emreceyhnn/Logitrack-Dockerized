 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts
const useDictionaryMock = mock.fn(() => ({
  landing: {
    pricing: {
      badge: "Pricing",
      title: "Pricing Title",
      monthly: "Monthly",
      yearly: "Yearly",
      save: "Save 20%",
      custom: "Custom",
      perMonth: "/mo",
      mostPopular: "Most Popular",
      tiers: {
        starter: { title: "Starter", description: "Starter Desc", features: ["F1"], cta: "Start" },
        pro: { title: "Pro", description: "Pro Desc", features: ["F2"], cta: "Pro Start" },
        enterprise: { title: "Enterprise", description: "Ent Desc", features: ["F3"], cta: "Contact" }
      },
      infrastructure: {
        title: "Infra",
        description: "Infra Desc",
        cta: "Learn More"
      },
      footer: { tos: "© {year}", support: "Support" }
    }
  }
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "dark",
    kpi: {
      cyan_alpha: { main_10: "#000", main_20: "#000", main_30: "#000", main_40: "#000", main_60: "#000" },
      slateLight_alpha: { main_05: "#000", main_10: "#000", main_40: "#000", main_60: "#000", main_70: "#000", main_80: "#000" },
      slateDark_alpha: { main_40: "#000", main_60: "#000", main_70: "#000" },
      slateDeepest_alpha: { main_50: "#000" }
    },
    success: { main: "#2e7d32", _alpha: { main_10: "#000", main_30: "#000" } }
  } as unknown
});
import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("PricingPage Component", () => {
  let PricingPage: unknown;

  before(async () => {
    const mod = await import("./page");
    PricingPage = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("PricingPage() Render Testleri", () => {
    it("should_RenderPricingTiers_AndToggleYearly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <PricingPage />
        </ThemeProvider>
      );

      // Assert basic render
      expect(screen.getByText("Pricing Title")).toBeTruthy();
      expect(screen.getByText("Starter")).toBeTruthy();
      expect(screen.getByText("$49")).toBeTruthy(); // Monthly price

      // Toggle switch
      const switchElement = screen.getByRole("checkbox");
      fireEvent.click(switchElement);

      // Verify yearly price is shown
      expect(screen.getByText("$39")).toBeTruthy();
    });

    it("should_RouteSelfServeTiersToSignUp_AndEnterpriseToContact", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <PricingPage />
        </ThemeProvider>
      );

      // Starter + Pro CTAs are self-serve → sign-up; Enterprise → contact/demo.
      const starterBtn = screen.getByText("Start").closest("a");
      const proBtn = screen.getByText("Pro Start").closest("a");
      const enterpriseBtn = screen.getByText("Contact").closest("a");

      expect(starterBtn?.getAttribute("href")).toContain("/auth/sign-up");
      expect(starterBtn?.getAttribute("href")).toContain("plan=starter");
      expect(proBtn?.getAttribute("href")).toContain("/auth/sign-up");
      expect(proBtn?.getAttribute("href")).toContain("plan=pro");
      expect(enterpriseBtn?.getAttribute("href")).toContain("type=demo");
      expect(enterpriseBtn?.getAttribute("href")).not.toContain("/auth/sign-up");
    });
  });
});
