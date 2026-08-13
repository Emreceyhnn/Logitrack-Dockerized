 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  routes: {
    title: "Route",
    dialogs: {
      deliveryLabel: "Delivery",
      driverAssignment: "Driver Assignment",
    },
    details: {
      distance: "Distance",
      stops: "Stops",
    },
    statuses: {
      ACTIVE: "Active",
      COMPLETED: "Completed",
      PENDING: "Pending",
      PLANNED: "Planned",
      CANCELED: "Canceled",
    }
  },
  toasts: {
    successUpdate: "Updated",
    errorGeneric: "Error",
  },
  common: {
    na: "N/A",
    start: "Start Route",
    cancel: "Cancel",
    complete: "Complete Route",
  },
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

const updateRouteStatusMock = mock.fn(async () => ({}));
mock.module("../../../lib/controllers/routes.ts", {
  namedExports: {
    createRoute: mock.fn(async () => ({})),
    updateRoute: mock.fn(async () => ({})),
    updateRouteStatus: updateRouteStatusMock,
    deleteRoute: mock.fn(async () => {}),
    getRouteStats: mock.fn(async () => null),
    getRouteEfficiencyStats: mock.fn(async () => null),
    getActiveRoutesLocations: mock.fn(async () => []),
  },
});

const routeQueryClientMock = { invalidateQueries: mock.fn(), cancelQueries: mock.fn(async () => {}), getQueryCache: mock.fn(() => ({ findAll: () => [] })), setQueryData: mock.fn() };
mock.module("@tanstack/react-query", {
  namedExports: {
    useQuery: mock.fn(() => ({ data: null })),
    useMutation: mock.fn((options: Record<string, unknown>) => ({
      mutate: (variables: Record<string, unknown>, callbacks?: Record<string, unknown>) => {
        Promise.resolve().then(async () => {
          const context = await (options.onMutate as ((v: unknown) => unknown) | undefined)?.(variables);
          try {
            const res = await (options.mutationFn as (v: unknown) => Promise<unknown>)(variables);
            await (options.onSuccess as ((r: unknown, v: unknown, c: unknown) => void) | undefined)?.(res, variables, context);
            (callbacks?.onSuccess as (() => void) | undefined)?.();
          } catch (e) {
            (options.onError as ((e: unknown, v: unknown, c: unknown) => void) | undefined)?.(e, variables, context);
          } finally {
            (options.onSettled as (() => void) | undefined)?.();
          }
        });
      },
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
    useQueryClient: mock.fn(() => routeQueryClientMock),
    keepPreviousData: "keepPreviousData",
  },
});

// Mock Heavy Components
mock.module("../../cards/driverCard.tsx", {
  defaultExport: () => <div data-testid="driver-card-mock">DriverCard</div>,
});
mock.module("./map.tsx", {
  defaultExport: () => <div data-testid="map-mock">Map</div>,
});
mock.module("./progress.tsx", {
  defaultExport: () => <div data-testid="progress-mock">Progress</div>,
});
mock.module("./telemetry.tsx", {
  defaultExport: () => <div data-testid="telemetry-mock">Telemetry</div>,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    success: { main: "#2e7d32", dark: "#1b5e20" } as unknown,
    warning: { main: "#ed6c02" } as unknown,
    error: { main: "#d32f2f", dark: "#c62828" } as unknown,
    info: { main: "#0288d1" } as unknown,
    background: { default: "#121212" } as unknown,
    divider_alpha: { main_05: "rgba()", main_10: "rgba()" } as unknown,
  }
});

// Add alphas
(customTheme.palette.primary as unknown)._alpha = { main_10: "rgba()", main_20: "rgba()" };
(customTheme.palette.success as unknown)._alpha = { main_10: "rgba()", main_20: "rgba()" };
(customTheme.palette.warning as unknown)._alpha = { main_10: "rgba()", main_20: "rgba()" };
(customTheme.palette.error as unknown)._alpha = { main_05: "rgba()", main_10: "rgba()", main_20: "rgba()" };
(customTheme.palette.info as unknown)._alpha = { main_10: "rgba()", main_20: "rgba()" };
(customTheme.palette.background as unknown).midnight = { _alpha: { main_80: "rgba()" } };
(customTheme.palette.common as unknown) = { white_alpha: { main_01: "rgba()", main_03: "rgba()", main_05: "rgba()", main_50: "rgba()" } };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

const MOCK_ROUTE = {
  id: "route-123",
  status: "PLANNED",
  name: "Morning Delivery",
  driver: null,
  vehicle: null,
  distanceKm: 120,
  metrics: { totalDistanceKm: 120 },
  shipments: [],
};

describe("RouteDialog RTL Component", () => {
  let RouteDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    RouteDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
    updateRouteStatusMock.mock.resetCalls();
    toastMock.success.mock.resetCalls();
    toastMock.error.mock.resetCalls();
  });

  describe("RouteDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <RouteDialog open={true} onClose={() => {}} route={MOCK_ROUTE} />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByText(/Route #TE-123/i)).toBeTruthy();
      expect(screen.getByText(/Planned/i)).toBeTruthy(); // the badge
      expect(screen.getByTestId("map-mock")).toBeTruthy();
    });

    it("should_CallStatusUpdate_WhenActionButtonIsClicked", async () => {
      const onSuccessMock = mock.fn();
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <RouteDialog open={true} onClose={() => {}} onSuccess={onSuccessMock} route={MOCK_ROUTE} />
        </ThemeProvider>
      );

      // Since status is PLANNED, we should see a "Start Route" button
      const startBtn = screen.getByText(/Start Route/i);
      fireEvent.click(startBtn);

      // Wait for async update
      await waitFor(() => {
        expect(updateRouteStatusMock.mock.calls.length).toBe(1);
        expect(updateRouteStatusMock.mock.calls[0].arguments).toEqual(["route-123", "ACTIVE"]);
        expect(toastMock.success.mock.calls.length).toBe(1);
        expect(onSuccessMock.mock.calls.length).toBe(1);
      });
    });
  });
});
