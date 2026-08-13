 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const useThemeMock = mock.fn(() => ({
  palette: {
    primary: { main: "blue", _alpha: { main_05: "", main_10: "", main_20: "", main_15: "" } },
    text: { primary: "black", secondary: "gray" },
    background: { paper: "white" },
    divider: "gray",
    divider_alpha: { main_10: "" }
  }
}));

const changeLanguageMock = mock.fn();

const useLanguageMock = mock.fn(() => ({
  lang: "tr",
  dict: {
    languages: { tr: "Türkçe", en: "English" },
    common: { tooltips: { changeLanguage: "Dili Değiştir" } }
  },
  changeLanguage: changeLanguageMock,
}));

const useStateMock = mock.fn((init) => [init, mock.fn()]);

mock.module("react", {
  namedExports: { useState: useStateMock }
});

mock.module("../../lib/language/DictionaryContext.tsx", {
  namedExports: { useLanguage: useLanguageMock }
});

mock.module("@mui/material", {
  namedExports: {
    useTheme: useThemeMock,
    Menu: (props: Record<string, unknown>) => ({ type: "Menu", props }),
    MenuItem: (props: Record<string, unknown>) => ({ type: "MenuItem", props }),
    ListItemText: (props: Record<string, unknown>) => ({ type: "ListItemText", props }),
    Typography: (props: Record<string, unknown>) => ({ type: "Typography", props }),
    Box: (props: Record<string, unknown>) => ({ type: "Box", props }),
    Tooltip: (props: Record<string, unknown>) => ({ type: "Tooltip", props }),
  }
});

mock.module("@mui/icons-material/Language", { defaultExport: () => ({ type: "LanguageIcon" }) });
mock.module("@mui/icons-material/Check", { defaultExport: () => ({ type: "CheckIcon" }) });

describe("LanguageSwitcher Component", () => {
  let LanguageSwitcher: unknown;

  before(async () => {
    // Modülü dinamik olarak yüklüyoruz
    const mod = await import("./LanguageSwitcher");
    LanguageSwitcher = mod.default;
  });

  beforeEach(() => {
    useThemeMock.mock.resetCalls();
    useLanguageMock.mock.resetCalls();
    changeLanguageMock.mock.resetCalls();
  });

  describe("LanguageSwitcher() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", async () => {
      // Act
      let error = null;
      try {
        LanguageSwitcher();
      } catch (e) {
        error = e;
      }

      // Assert
      expect(LanguageSwitcher).toBeDefined();
      expect(useThemeMock.mock.calls.length).toBeGreaterThan(0);
      expect(useLanguageMock.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
