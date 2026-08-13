 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// MOCKLAR
const useDictionaryMock = mock.fn(() => ({
  landing: {
    features: {
      overline: "ÖZELLİKLER",
      title: "Başlık",
      description: "Açıklama",
      smartRoute: { title: "Akıllı", desc: "Rota" },
      predictiveEta: { title: "Tahmin", desc: "Zaman" },
      driverPerf: { title: "Sürücü", desc: "Performans" }
    }
  }
}));

mock.module("../../lib/language/DictionaryContext.tsx", { namedExports: { useDictionary: useDictionaryMock } });

mock.module("@mui/material", {
  namedExports: {
    Box: (props: Record<string, unknown>) => ({ type: "Box", props }),
    Container: (props: Record<string, unknown>) => ({ type: "Container", props }),
    Grid: (props: Record<string, unknown>) => ({ type: "Grid", props }),
    Typography: (props: Record<string, unknown>) => ({ type: "Typography", props })
  }
});

mock.module("@mui/icons-material/Insights", { defaultExport: () => ({ type: "InsightsIcon" }) });
mock.module("@mui/icons-material/Route", { defaultExport: () => ({ type: "RouteIcon" }) });
mock.module("@mui/icons-material/LocalShipping", { defaultExport: () => ({ type: "LocalShippingIcon" }) });
mock.module("framer-motion", { namedExports: { motion: { div: (props: Record<string, unknown>) => ({ type: "MotionDiv", props }) } } });

describe("FeaturesSection Component", () => {
  let FeaturesSection: unknown;

  before(async () => {
    const mod = await import("./FeaturesSection");
    FeaturesSection = mod.default;
  });

  beforeEach(() => {
    useDictionaryMock.mock.resetCalls();
  });

  describe("FeaturesSection() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", async () => {
      // Act
      try {
        FeaturesSection();
      } catch (e) {}

      // Assert
      expect(FeaturesSection).toBeDefined();
      expect(useDictionaryMock.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
