 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const changeLanguageMock = mock.fn();
const useLanguageMock = mock.fn(() => ({
  lang: "tr",
  dict: {
    settings: {
      dialogs: {
        success: {
          regional: "Regional settings saved",
          notifications: "Notifications saved",
        },
        tabs: {
          localization: "Localization",
          signals: "Signals",
          visualEngine: "Visual Engine",
        },
      },
    },
  },
  changeLanguage: changeLanguageMock,
}));

const useUserContextMock = mock.fn(() => ({
  user: {
    id: "u1",
    currency: "USD",
    timezone: "UTC",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    notifEmailShipment: true,
    notifEmailMaint: true,
    notifEmailWeekly: false,
    notifPushAssignment: true,
    notifPushDelay: true,
  },
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useLanguage: useLanguageMock },
});

mock.module("../../../lib/context/UserContext.tsx", {
  namedExports: { useUserContext: useUserContextMock },
});

const useRouterMock = mock.fn(() => ({ push: mock.fn(), refresh: mock.fn() }));

mock.module("next/navigation", {
  namedExports: {
    useRouter: useRouterMock,
  },
});

// 3. Mock External Libraries and API Controllers
mock.module("sonner", {
  namedExports: { toast: { success: mock.fn(), error: mock.fn() } },
});

mock.module("../../../lib/controllers/users.ts", {
  namedExports: {
    updateUserRegionalSettings: mock.fn(async () => ({})),
    updateUserNotificationSettings: mock.fn(async () => ({})),
  },
});



mock.module("framer-motion", {
  namedExports: {
    motion: {
      div: ({ children  }: Record<string, unknown>) => <div data-testid="motion-div">{children}</div>,
    },
    AnimatePresence: ({ children  }: Record<string, unknown>) => <>{children}</>,
  },
});

// 4. Mock Subcomponents
mock.module("./components/SettingsHeader.tsx", { defaultExport: () => <div data-testid="settings-header" /> });
mock.module("./components/RegionalTab.tsx", { defaultExport: () => <div data-testid="regional-tab" /> });
mock.module("./components/NotificationsTab.tsx", { defaultExport: () => <div data-testid="notifications-tab" /> });
mock.module("./components/AppearanceTab.tsx", { defaultExport: () => <div data-testid="appearance-tab" /> });

// 5. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" } as unknown,
    divider_alpha: { main_08: "rgba()" } as unknown,
  }
});
(customTheme.palette.primary as unknown)._alpha = { main_50: "rgba()" };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

// 6. Mock localStorage
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: mock.fn(() => "dark"),
    setItem: mock.fn(),
    removeItem: mock.fn(),
    clear: mock.fn(),
  },
  writable: true
});

describe("SettingsDialog RTL Component", () => {
  let SettingsDialog: unknown;

  before(async () => {
    const mod = await import("./SettingsDialog");
    SettingsDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("SettingsDialog() bileşeni", () => {
    it("should_RenderSettingsDialog_AndDefaultToRegionalTab", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <SettingsDialog open={true} onClose={() => {}} />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByTestId("settings-header")).toBeTruthy();
      
      // Check tabs
      expect(screen.getByText(/Localization/i)).toBeTruthy();
      expect(screen.getByText(/Signals/i)).toBeTruthy();
      expect(screen.getByText(/Visual Engine/i)).toBeTruthy();

      // Check default active tab component
      expect(screen.getByTestId("regional-tab")).toBeTruthy();
      expect(screen.queryByTestId("notifications-tab")).toBeNull();
      expect(screen.queryByTestId("appearance-tab")).toBeNull();
    });
  });
});
