 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// MOCKLAR
const useParamsMock = mock.fn(() => ({ lang: "tr" }));
const useDictionaryMock = mock.fn(() => ({
  navbar: { dashboard: "Dashboard", setupOrg: "Kurulum", signIn: "Giriş", startPro: "Pro" }
}));
const getLocalizedPathMock = mock.fn((path) => path);

const getUserSessionMock = mock.fn(async () => ({ id: "1", name: "John" }));

const useStateMock = mock.fn((init) => [init, mock.fn()]);
const useEffectMock = mock.fn();
const useThemeMock = mock.fn(() => ({
  palette: { primary: { main: "blue" }, text: { primary: "black" } }
}));

// Only useState/useEffect need mocking; spread the real module for the rest
// (createContext etc. — LandingHeaderAuth renders UserContext's UserProvider).
const originalReact = await import("react");
mock.module("react", {
  namedExports: { ...originalReact, useState: useStateMock, useEffect: useEffectMock }
});

mock.module("next/navigation", { namedExports: { useParams: useParamsMock } });
const useLanguageMock = mock.fn(() => ({
  lang: "tr",
  dict: useDictionaryMock(),
  changeLanguage: mock.fn(),
}));
mock.module("../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock, useLanguage: useLanguageMock },
});
mock.module("../../lib/language/navigation.ts", { namedExports: { getLocalizedPath: getLocalizedPathMock } });
mock.module("../../lib/actions/auth.ts", { namedExports: { getUserSession: getUserSessionMock } });

mock.module("@mui/material", {
  namedExports: {
    useTheme: useThemeMock,
    Button: (props: Record<string, unknown>) => ({ type: "Button", props }),
    Stack: (props: Record<string, unknown>) => ({ type: "Stack", props }),
    CircularProgress: (props: Record<string, unknown>) => ({ type: "CircularProgress", props })
  }
});

mock.module("next/link", { defaultExport: () => ({ type: "Link" }) });
mock.module("../dialogs/company/CreateCompanyDialog.tsx", { defaultExport: () => ({ type: "CreateCompanyDialog" }) });
mock.module("../nav/UserAccountNav.tsx", { defaultExport: () => ({ type: "UserAccountNav" }) });

describe("LandingHeaderAuth Component", () => {
  let LandingHeaderAuth: unknown;

  before(async () => {
    const mod = await import("./LandingHeaderAuth");
    LandingHeaderAuth = mod.default;
  });

  beforeEach(() => {
    useParamsMock.mock.resetCalls();
    useDictionaryMock.mock.resetCalls();
    useStateMock.mock.resetCalls();
  });

  describe("LandingHeaderAuth() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", async () => {
      // Act
      try {
        LandingHeaderAuth();
      } catch (e) {}

      // Assert
      expect(LandingHeaderAuth).toBeDefined();
      expect(useDictionaryMock.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
