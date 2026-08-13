 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// Mock next/dynamic
mock.module("next/dynamic", {
  defaultExport: (dynamicImport: Record<string, unknown>) => {
    return () => {
      dynamicImport(); // Execute the import function to satisfy test coverage if needed
      return <div data-testid="dynamic-component">Dynamic Component</div>;
    };
  },
});

// Mock static component
mock.module("../../../components/landing/HeroSection.tsx", {
  defaultExport: () => <div data-testid="hero-section">Hero Section</div>,
});

// Mock dynamic components (so their import() doesn't fail if they don't exist yet, or just let next/dynamic mock handle it. Next/dynamic mock calls the import, so we need to mock the files)
mock.module("../../../components/landing/SocialProof.tsx", { defaultExport: () => null });
mock.module("../../../components/landing/OperationsDashboard.tsx", { defaultExport: () => null });
mock.module("../../../components/landing/FeaturesSection.tsx", { defaultExport: () => null });
mock.module("../../../components/landing/LandingFooter.tsx", { defaultExport: () => null });

describe("LandingPage Component", () => {
  let LandingPage: unknown;

  before(async () => {
    const mod = await import("./page");
    LandingPage = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("LandingPage() Render Testleri", () => {
    it("should_RenderHeroAndDynamicSections_Correctly", async () => {
      // Act
      render(<LandingPage />);

      // Assert
      expect(screen.getByTestId("hero-section")).toBeTruthy();
      
      // DeferredSections renders 3 lazy sections (SocialProof, OperationsDashboard,
      // FeaturesSection) via next/dynamic.
      const dynamicComponents = screen.getAllByTestId("dynamic-component");
      expect(dynamicComponents.length).toBe(3);
    });
  });
});
