 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// HowItWorksClient is a Server Component now — the dictionary arrives as a
// prop from page.tsx instead of the useDictionary() context hook, so the test
// passes the mock dict directly.
const mockDict = {
  landing: {
    howItWorksPage: {
      hero: { overline: "Overline", title: "How It Works", subtitle: "Subtitle" },
      cta: { title: "CTA Title", subtitle: "CTA Subtitle", getStarted: "Get Started", bookDemo: "Book Demo" },
      footer: { rights: "© {year}", privacy: "Privacy", terms: "Terms", help: "Help" }
    }
  }
};

// Mock Child Component
mock.module("../../../../components/how-it-works/TimelineSection.tsx", {
  defaultExport: () => <div data-testid="timeline-section">Timeline Section</div>,
});

describe("HowItWorksPage Component", () => {
  let HowItWorksClient: unknown;

  before(async () => {
    const mod = await import("./HowItWorksClient");
    HowItWorksClient = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("HowItWorksClient() Render Testleri", () => {
    it("should_RenderHowItWorksContent_Correctly", async () => {
      // Act
      render(<HowItWorksClient dict={mockDict as unknown} />);

      // Assert
      expect(screen.getByText("How It Works")).toBeTruthy();
      expect(screen.getByTestId("timeline-section")).toBeTruthy();
      expect(screen.getByText("CTA Title")).toBeTruthy();
    });
  });
});
