 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  profile: {
    tabs: {
      account: "Account",
      security: "Security",
    },
    messages: {
      loadError: "Load Error",
      saveSuccess: "Saved",
      networkError: "Network Error",
      passwordSuccess: "Password Updated",
      verificationError: "Verification Error",
    },
    status: {
      synchronizing: "Loading...",
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const toastMock = {
  success: mock.fn(),
  error: mock.fn(),
};

mock.module("sonner", {
  namedExports: { toast: toastMock },
});

const getMyProfileMock = mock.fn(async () => ({
  name: "John",
  surname: "Doe",
  email: "john@example.com",
  avatarUrl: null,
  lastLoginAt: new Date(),
  createdAt: new Date(),
}));

mock.module("../../../lib/actions/profile.ts", {
  namedExports: {
    getMyProfile: getMyProfileMock,
    updateMyProfile: mock.fn(async () => ({})),
    changeMyPassword: mock.fn(async () => ({}))
  },
});

// ProfileDialog now reads/writes profile state through useProfile/useProfileMutations
// (TanStack Query) instead of local useState — mock the library like the other
// hook-driven component tests do, so no real QueryClientProvider is needed.
const profileQueryDataMock = {
  name: "John",
  surname: "Doe",
  email: "john@example.com",
  avatarUrl: null as string | null,
};
mock.module("@tanstack/react-query", {
  namedExports: {
    useQuery: mock.fn(() => ({ data: profileQueryDataMock, isLoading: false })),
    useMutation: mock.fn((options: Record<string, unknown>) => ({
      isPending: false,
      mutateAsync: async (variables: Record<string, unknown>) => {
        const context = await (options.onMutate as ((v: unknown) => unknown) | undefined)?.(variables);
        try {
          const res = await (options.mutationFn as (v: unknown) => Promise<unknown>)(variables);
          await (options.onSuccess as ((r: unknown, v: unknown, c: unknown) => void) | undefined)?.(res, variables, context);
          return res;
        } catch (e) {
          (options.onError as ((e: unknown, v: unknown, c: unknown) => void) | undefined)?.(e, variables, context);
          throw e;
        } finally {
          (options.onSettled as (() => void) | undefined)?.();
        }
      },
    })),
    useQueryClient: mock.fn(() => ({
      cancelQueries: mock.fn(async () => {}),
      getQueryData: mock.fn(() => profileQueryDataMock),
      setQueryData: mock.fn(),
      invalidateQueries: mock.fn(),
    })),
  },
});

mock.module("framer-motion", {
  namedExports: {
    motion: {
      div: ({ children, onClick  }: Record<string, unknown>) => <div data-testid="motion-div" onClick={onClick}>{children}</div>,
    },
    AnimatePresence: ({ children  }: Record<string, unknown>) => <>{children}</>,
  },
});

// Mock Subcomponents
mock.module("./components/ProfileHeader.tsx", {
  defaultExport: () => <div data-testid="profile-header">ProfileHeader</div>,
});
mock.module("./components/ProfileTab.tsx", {
  defaultExport: () => <div data-testid="profile-tab">ProfileTab</div>,
});
mock.module("./components/SecurityTab.tsx", {
  defaultExport: () => <div data-testid="security-tab">SecurityTab</div>,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
  }
});
(customTheme.palette.primary as unknown)._alpha = { main_50: "rgba()" };
(customTheme.palette as unknown).divider_alpha = { main_08: "rgba()" };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("ProfileDialog RTL Component", () => {
  let ProfileDialog: unknown;

  before(async () => {
    const mod = await import("./ProfileDialog");
    ProfileDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("ProfileDialog() bileşeni", () => {
    it("should_RenderProfileTabs_AndSwitchBetweenThem", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <ProfileDialog open={true} onClose={() => {}} />
        </ThemeProvider>
      );

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.getByTestId("profile-tab")).toBeTruthy();
      });

      // Switch to Security Tab
      const securityTab = screen.getByText(/Security/i);
      fireEvent.click(securityTab);

      // Assert Security Tab is mounted
      expect(screen.getByTestId("security-tab")).toBeTruthy();
    });
  });
});
