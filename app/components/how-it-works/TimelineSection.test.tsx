 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// MOCKLAR
const useThemeMock = mock.fn(() => ({
  palette: {
    kpi: {
      cyan: "cyan",
      indigo: "indigo",
      purple: "purple",
      cyan_alpha: { main_30: "", main_20: "", main_05: "", main_40: "", main_10: "" },
      indigo_alpha: { main_30: "", main_20: "", main_05: "", main_40: "", main_10: "" },
      purple_alpha: { main_30: "", main_20: "", main_05: "", main_40: "", main_10: "" }
    }
  }
}));

const useDictionaryMock = mock.fn(() => ({
  landing: {
    workflow: {
      title1: "1", desc1: "1",
      title2: "2", desc2: "2",
      title3: "3", desc3: "3",
      title4: "4", desc4: "4",
      title5: "5", desc5: "5",
      title6: "6", desc6: "6"
    }
  },
  common: { step: "Adım" }
}));

mock.module("../../lib/language/DictionaryContext.tsx", { namedExports: { useDictionary: useDictionaryMock } });

mock.module("@mui/material", {
  namedExports: {
    useTheme: useThemeMock,
    Box: (props: Record<string, unknown>) => ({ type: "Box", props }),
    Stack: (props: Record<string, unknown>) => ({ type: "Stack", props }),
    Typography: (props: Record<string, unknown>) => ({ type: "Typography", props })
  }
});

mock.module("framer-motion", { namedExports: { motion: { div: (props: Record<string, unknown>) => ({ type: "MotionDiv", props }) } } });

describe("TimelineSection Component", () => {
  let TimelineSection: unknown;

  before(async () => {
    const mod = await import("./TimelineSection");
    TimelineSection = mod.default;
  });

  beforeEach(() => {
    useThemeMock.mock.resetCalls();
    useDictionaryMock.mock.resetCalls();
  });

  describe("TimelineSection() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", async () => {
      // Act
      let error = null;
      try {
        TimelineSection();
      } catch (e) {
        error = e;
      }

      // Assert
      expect(error).toBeNull();
      expect(TimelineSection).toBeDefined();
      expect(useThemeMock.mock.calls.length).toBeGreaterThan(0);
      expect(useDictionaryMock.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
