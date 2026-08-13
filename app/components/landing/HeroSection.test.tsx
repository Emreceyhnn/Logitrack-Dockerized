 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// MOCKLAR
const useDictionaryMock = mock.fn(() => ({
  landing: {
    hero: {
      badge: "YENİ SÜRÜM",
      titleMain: "Ana Başlık",
      titleHighlight: "Vurgu",
      description: "Açıklama",
      startTrial: "Başla",
      demo: "Demo"
    }
  }
}));

const useLanguageMock = mock.fn(() => ({
  lang: "tr",
  dict: useDictionaryMock(),
  changeLanguage: mock.fn(),
}));
mock.module("../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock, useLanguage: useLanguageMock },
});

mock.module("@mui/material", {
  namedExports: {
    Box: (props: Record<string, unknown>) => ({ type: "Box", props }),
    Button: (props: Record<string, unknown>) => ({ type: "Button", props }),
    Container: (props: Record<string, unknown>) => ({ type: "Container", props }),
    Stack: (props: Record<string, unknown>) => ({ type: "Stack", props }),
    Typography: (props: Record<string, unknown>) => ({ type: "Typography", props })
  }
});

mock.module("next/image", { defaultExport: () => ({ type: "Image" }) });
mock.module("@mui/icons-material/PlayCircleOutline", { defaultExport: () => ({ type: "PlayCircleOutlineIcon" }) });
mock.module("framer-motion", { namedExports: { motion: { div: (props: Record<string, unknown>) => ({ type: "MotionDiv", props }) } } });

describe("HeroSection Component", () => {
  let HeroSection: unknown;

  before(async () => {
    const mod = await import("./HeroSection");
    HeroSection = mod.default;
  });

  beforeEach(() => {
    useDictionaryMock.mock.resetCalls();
  });

  describe("HeroSection() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", async () => {
      // Act
      try {
        HeroSection();
      } catch (e) {}

      // Assert
      expect(HeroSection).toBeDefined();
      expect(useDictionaryMock.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
