 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// 1. Mocks
const mockDict = {
  analytics: {
    title: "Analytics",
    subtitle: "Overview of your logistics performance",
    exportReport: "Export Report",
    periods: {
      last7Days: "Last 7 Days",
      last30Days: "Last 30 Days",
      lastQuarter: "Last Quarter",
      yearToDate: "Year to Date",
    },
  },
};

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

describe("AnalyticsHeader RTL Component", () => {
  let AnalyticsHeader: unknown;

  before(async () => {
    const mod = await import("./AnalyticsHeader");
    AnalyticsHeader = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("AnalyticsHeader() bileşeni", () => {
    it("should_RenderTitleAndSubtitle", async () => {
      render(<AnalyticsHeader />);
      expect(screen.getByText("Analytics")).toBeTruthy();
      expect(screen.getByText("Overview of your logistics performance")).toBeTruthy();
    });

    it("should_RenderExportButton", async () => {
      render(<AnalyticsHeader />);
      expect(screen.getByText("Export Report")).toBeTruthy();
    });

    it("should_RenderPeriodSelectorWithDefaultValue", async () => {
      render(<AnalyticsHeader />);
      // Default value should render the label text inside the select input
      expect(screen.getByText("Last 30 Days")).toBeTruthy();
    });
  });
});
