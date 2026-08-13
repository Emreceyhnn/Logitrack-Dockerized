 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  routes: {
    dialogs: {
      editTitle: "Edit Route",
      editSubtitle: "Modify route parameters",
      steps: {
        schedule: "Schedule",
        locations: "Locations",
        assignments: "Assignments",
      }
    }
  },
  toasts: {
    loading: "Loading...",
    successUpdate: "Updated",
    errorGeneric: "Error",
  },
  common: {
    cancel: "Cancel",
    save: "Save",
    back: "Back",
    next: "Next",
  },
  validation: {
    genericFormError: "Form Error",
  }
}));


const stableDict = {
      common: { back: "Back", cancel: "Cancel", next: "Next", save: "Save" },
      routes: {
        details: { delivery: "Delivery" },
        dialogs: {
          addTitle: "Add Route", addSubtitle: "Add subtitle",
          editTitle: "Edit Route", editSubtitle: "Edit subtitle",
          deliveryLabel: "Delivery {n}", prefilledFrom: "Prefilled from {name}",
          steps: { locations: "Locations", schedule: "Schedule", assignments: "Assignments" },
        },
      },
      shipments: {
        dialogs: {
          addTitle: "Add Shipment", addSubtitle: "Add subtitle",
          editTitle: "Edit Shipment", editSubtitle: "Edit subtitle",
          cargoTitle: "Cargo",
          fields: { exceedsTrailerVolume: "Exceeds volume", exceedsTrailerWeight: "Exceeds weight" },
          steps: { cargo: "Cargo", logistics: "Logistics" },
        },
      },
      toasts: { errorGeneric: "Error", loading: "Loading", successAdd: "Added", successUpdate: "Updated" },
      validation: {
        genericFormError: "Form error",
        required: "{field} is required",
        min: "{field} must be at least {min}",
        max: "{field} must be at most {max}",
        email: "Invalid email",
        positive: "{field} must be positive",
        oneOf: "{field} must be one of the allowed values",
        endTimeAfterStart: "End time must be after start time",
      },
    };
const stableUserResult = { user: { id: "user-1", companyId: "comp-1", currency: "USD" } };

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: {
    useDictionary: () => stableDict,
  },
});

mock.module("../../../hooks/useUser.ts", {
  namedExports: { useUser: () => stableUserResult },
});

mock.module("../../../hooks/useRoutes.ts", {
  namedExports: {
    useRouteMutations: () => ({
      updateRoute: { mutateAsync: mock.fn(async () => ({})), isPending: false },
    }),
  },
});

mock.module("./addRouteDialog/firstStep.tsx", {
  defaultExport: () => <div data-testid="first-step">First Step</div>,
});
mock.module("./addRouteDialog/secondStep.tsx", {
  defaultExport: () => <div data-testid="second-step">Second Step</div>,
});
mock.module("./addRouteDialog/thirdStep.tsx", {
  defaultExport: () => <div data-testid="third-step">Third Step</div>,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
  }
});

(customTheme.palette.primary as unknown)._alpha = { main_20: "rgba()" };
(customTheme.palette as unknown).divider_alpha = { main_05: "rgba()", main_10: "rgba()" };

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
  startTime: new Date().toISOString(),
  endTime: new Date().toISOString(),
  distanceKm: 120,
};

describe("EditRouteDialog RTL Component", () => {
  let EditRouteDialog: unknown;

  before(async () => {
    const mod = await import("./edit-route-dialog");
    EditRouteDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("EditRouteDialog() bileşeni", () => {
    it("should_RenderFormFields_AndPopulateWithRouteData", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <EditRouteDialog open={true} onClose={() => {}} route={MOCK_ROUTE} />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByText(/Edit Route/i)).toBeTruthy();
      
      // Step 1 should be active by default
      expect(screen.getByTestId("first-step")).toBeTruthy();
    });
  });
});
