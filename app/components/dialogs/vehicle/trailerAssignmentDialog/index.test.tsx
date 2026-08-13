 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
    confirm: "Confirm",
  },
  trailers: {
    assignToVehicle: "Assign to Vehicle",
    currentVehicle: "Vehicle",
    types: {
      DRY_VAN: "Dry Van",
      REFRIGERATED: "Refrigerated",
    },
  },
}));

const assignTrailerMock = mock.fn(async () => ({}));
const useTrailerMutationsMock = mock.fn(() => ({
  assignTrailer: { mutateAsync: assignTrailerMock, isPending: false },
}));

const useVehiclesMock = mock.fn(() => ({
  data: [{ id: "v1", plate: "34 ABC", brand: "Ford", model: "F-150" }],
  isLoading: false,
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../hooks/useTrailers.ts", {
  namedExports: { useTrailerMutations: useTrailerMutationsMock },
});

mock.module("../../../../hooks/useVehicles.ts", {
  namedExports: { useVehicles: useVehiclesMock },
});

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
  },
});

describe("TrailerAssignmentDialog RTL Component", () => {
  let TrailerAssignmentDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    TrailerAssignmentDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("TrailerAssignmentDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Act
      render(
        <TrailerAssignmentDialog
          open={true}
          onClose={() => {}}
          trailer={{ id: "t1", plate: "TR-01", type: "DRY_VAN" }}
        />
      );

      // Assert
      expect(screen.getByText("Assign to Vehicle")).toBeTruthy();
      expect(screen.getAllByText("Vehicle").length).toBeGreaterThan(0);
      expect(screen.getByText("Confirm")).toBeTruthy();
    });
  });
});
