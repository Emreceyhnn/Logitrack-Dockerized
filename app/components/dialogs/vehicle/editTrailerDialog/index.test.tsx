 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
    save: "Save",
  },
  trailers: {
    editTrailer: "Edit Trailer",
    plate: "Plate",
    fleetNo: "Fleet No",
    type: "Type",
    capacity: "Capacity",
    maxLoad: "Max Load",
    coldChain: "Cold Chain",
    types: {
      DRY_VAN: "Dry Van",
      REFRIGERATED: "Refrigerated",
      FLATBED: "Flatbed",
    },
  },
}));

const updateTrailerMock = mock.fn(async () => ({ id: "trailer-1" }));

const useTrailerMutationsMock = mock.fn(() => ({
  updateTrailer: { mutateAsync: updateTrailerMock },
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../hooks/useTrailers.ts", {
  namedExports: { useTrailerMutations: useTrailerMutationsMock },
});

describe("EditTrailerDialog RTL Component", () => {
  let EditTrailerDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    EditTrailerDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("EditTrailerDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Act
      render(
        <EditTrailerDialog
          open={true}
          onClose={() => {}}
          onSuccess={() => {}}
          trailer={{ id: "t1", plate: "34 ABC 123", type: "DRY_VAN" }}
        />
      );

      // Assert
      expect(screen.getByText("Edit Trailer")).toBeTruthy();
      expect(screen.getAllByText("Plate").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Fleet No").length).toBeGreaterThan(0);
      expect(screen.getByText("Save")).toBeTruthy();
    });
  });
});
