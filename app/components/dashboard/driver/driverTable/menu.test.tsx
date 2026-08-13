 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

// 1. Mocks
const mockDict = {
  drivers: {
    actions: {
      details: "Details",
      edit: "Edit",
      delete: "Delete",
    },
  },
};

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

describe("RowActions RTL Component", () => {
  let RowActions: unknown;

  before(async () => {
    const mod = await import("./menu");
    RowActions = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("RowActions() bileşeni", () => {
    it("should_OpenMenuAndCallHandlers_WhenMenuItemsClicked", async () => {
      const handleOpenDetails = mock.fn();
      const handleEdit = mock.fn();
      const handleDelete = mock.fn();

      render(
        <RowActions
          id="d1"
          handleOpenDetails={handleOpenDetails}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
        />
      );

      // Menu is closed initially
      expect(screen.queryByText("Details")).toBeNull();

      // Open menu
      const moreIcon = screen.getByTestId("MoreVertIcon");
      fireEvent.click(moreIcon);

      // Now menu items are visible
      expect(screen.getByText("Details")).toBeTruthy();
      expect(screen.getByText("Edit")).toBeTruthy();
      expect(screen.getByText("Delete")).toBeTruthy();

      // Click Details
      fireEvent.click(screen.getByText("Details"));
      expect(handleOpenDetails.mock.calls.length).toBe(1);
      expect(handleOpenDetails.mock.calls[0].arguments[0]).toBe("d1");

      // Open menu again for Edit
      fireEvent.click(moreIcon);
      fireEvent.click(screen.getByText("Edit"));
      expect(handleEdit.mock.calls.length).toBe(1);

      // Open menu again for Delete
      fireEvent.click(moreIcon);
      fireEvent.click(screen.getByText("Delete"));
      expect(handleDelete.mock.calls.length).toBe(1);
    });
  });
});
