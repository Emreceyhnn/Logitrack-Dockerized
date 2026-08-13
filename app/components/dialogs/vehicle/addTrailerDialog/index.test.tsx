 
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
    addTrailer: "Add Trailer",
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

const createTrailerMock = mock.fn(async () => ({ id: "trailer-1" }));

const useTrailerMutationsMock = mock.fn(() => ({
  createTrailer: { mutateAsync: createTrailerMock, isPending: false },
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../hooks/useTrailers.ts", {
  namedExports: { useTrailerMutations: useTrailerMutationsMock },
});

describe("AddTrailerDialog Component", () => {
  let AddTrailerDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    AddTrailerDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("AddTrailerDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Act
      render(
        <AddTrailerDialog
          open={true}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      );

      // Assert
      expect(screen.getByText("Add Trailer")).toBeTruthy();
      expect(screen.getAllByText("Plate").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Fleet No").length).toBeGreaterThan(0);
      expect(screen.getByText("Save")).toBeTruthy();
    });
  });
});
