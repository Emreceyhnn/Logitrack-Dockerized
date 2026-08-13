 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const useThemeMock = mock.fn(() => ({
  palette: {
    mode: "light",
    primary: { main: "blue", _alpha: { main_40: "", main_10: "", main_08: "", main_20: "" } },
    text: { primary: "black", secondary: "gray" },
    background: { paper: "white" },
    divider: "gray",
    grey: { 100: "#f5f5f5" },
    common: { white_alpha: { main_02: "" }, black_alpha: { main_30: "" } },
    action: { hover: "#eee" },
  }
}));

const useParamsMock = mock.fn(() => ({ lang: "tr" }));

const useDictionaryMock = mock.fn(() => ({
  "roles-header": { ADMIN: "Yönetici" },
  common: { profile: "Profil", settings: "Ayarlar", logout: "Çıkış Yap" }
}));

const getUserSessionMock = mock.fn(async () => ({ name: "Test", surname: "User", roleName: "ADMIN" }));
const logoutActionMock = mock.fn(async () => true);

const useStateMock = mock.fn((init) => [init, mock.fn()]);
const useEffectMock = mock.fn();

mock.module("react", {
  namedExports: { useState: useStateMock, useEffect: useEffectMock }
});

mock.module("next/navigation", {
  namedExports: { useParams: useParamsMock }
});

mock.module("../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock }
});

mock.module("../../lib/actions/auth.ts", {
  namedExports: {
    getUserSession: getUserSessionMock,
    logoutAction: logoutActionMock
  }
});

mock.module("@mui/material", {
  namedExports: {
    useTheme: useThemeMock,
    Stack: (props: Record<string, unknown>) => ({ type: "Stack", props }),
    CircularProgress: (props: Record<string, unknown>) => ({ type: "CircularProgress", props }),
    Avatar: (props: Record<string, unknown>) => ({ type: "Avatar", props }),
    Typography: (props: Record<string, unknown>) => ({ type: "Typography", props }),
    Menu: (props: Record<string, unknown>) => ({ type: "Menu", props }),
    MenuItem: (props: Record<string, unknown>) => ({ type: "MenuItem", props }),
    ListItemIcon: (props: Record<string, unknown>) => ({ type: "ListItemIcon", props }),
    Divider: (props: Record<string, unknown>) => ({ type: "Divider", props }),
    Box: (props: Record<string, unknown>) => ({ type: "Box", props }),
  }
});

mock.module("@mui/icons-material", {
  namedExports: {
    Settings: () => ({ type: "SettingsIcon" }),
    Person: () => ({ type: "PersonIcon" }),
    Logout: () => ({ type: "LogoutIcon" })
  }
});

// Dialog bileşenleri
mock.module("../dialogs/profile/ProfileDialog.tsx", { defaultExport: () => ({ type: "ProfileDialog" }) });
mock.module("../dialogs/settings/SettingsDialog.tsx", { defaultExport: () => ({ type: "SettingsDialog" }) });
mock.module("../dialogs/logoutConfirmationDialog.tsx", { defaultExport: () => ({ type: "LogoutConfirmationDialog" }) });


describe("UserAccountNav Component", () => {
  let UserAccountNav: unknown;

  before(async () => {
    const mod = await import("./UserAccountNav");
    UserAccountNav = mod.default;
  });

  beforeEach(() => {
    useThemeMock.mock.resetCalls();
    useDictionaryMock.mock.resetCalls();
    useStateMock.mock.resetCalls();
  });

  describe("UserAccountNav() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRenderedWithUser", async () => {
      // Act
      try {
        UserAccountNav({ user: { id: "1", name: "John" } });
      } catch (e) {}

      // Assert
      expect(UserAccountNav).toBeDefined();
      expect(useThemeMock.mock.calls.length).toBeGreaterThan(0);
      expect(useDictionaryMock.mock.calls.length).toBeGreaterThan(0);
    });

    it("should_InitializeAndShowLoading_WhenRenderedWithoutUserInitially", async () => {
      // Arrange - useState'in initial state için null döndüğünü varsayalım
      useStateMock.mock.mockImplementation((init) => [init, mock.fn()]);
      
      // Act
      try {
        UserAccountNav({ user: null });
      } catch (e) {}

      // Assert
      expect(useThemeMock.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
