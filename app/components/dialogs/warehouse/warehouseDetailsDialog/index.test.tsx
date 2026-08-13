 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const useThemeMock = mock.fn(() => ({
  palette: {
    primary: { main: "blue", _alpha: { main_10: "" } },
    divider_alpha: { main_10: "" }
  }
}));

const useDictionaryMock = mock.fn(() => ({
  warehouses: {
    dialogs: {
      details: { overview: "Overview", inventory: "Inventory" }
    }
  },
  toasts: { demoActionDisabled: "Disabled in demo" }
}));

mock.module("@mui/material", {
  namedExports: { 
    useTheme: useThemeMock,
    Dialog: (props: Record<string, unknown>) => ({ type: "Dialog", props }),
    DialogContent: (props: Record<string, unknown>) => ({ type: "DialogContent", props }),
    Avatar: (props: Record<string, unknown>) => ({ type: "Avatar", props }),
    Typography: (props: Record<string, unknown>) => ({ type: "Typography", props }),
    Box: (props: Record<string, unknown>) => ({ type: "Box", props }),
    Stack: (props: Record<string, unknown>) => ({ type: "Stack", props }),
    IconButton: (props: Record<string, unknown>) => ({ type: "IconButton", props }),
    Tab: (props: Record<string, unknown>) => ({ type: "Tab", props }),
    Tabs: (props: Record<string, unknown>) => ({ type: "Tabs", props }),
  }
});

mock.module("@mui/icons-material/Close", { defaultExport: () => ({ type: "CloseIcon" }) });
mock.module("@mui/icons-material/Storefront", { defaultExport: () => ({ type: "WarehouseIcon" }) });
mock.module("@mui/icons-material/LocationOn", { defaultExport: () => ({ type: "LocationOnIcon" }) });
mock.module("@mui/icons-material/Business", { defaultExport: () => ({ type: "BusinessIcon" }) });
mock.module("@mui/icons-material/Edit", { defaultExport: () => ({ type: "EditIcon" }) });

import * as originalReact from "react";

mock.module("react", {
  namedExports: {
    ...originalReact,
    useState: (init: Record<string, unknown>) => [init, mock.fn()]
  }
});

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock }
});

// The dialog reads the pathname to detect the public Live Demo (where the
// edit action is disabled). Not the dashboard path here, so isDemo is false.
mock.module("next/navigation", {
  namedExports: { usePathname: mock.fn(() => "/en/warehouses") }
});

mock.module("sonner", { namedExports: { toast: { info: mock.fn() } } });

mock.module("./overviewTab.tsx", { defaultExport: () => ({ type: "OverviewTab" }) });
mock.module("./inventoryTab.tsx", { defaultExport: () => ({ type: "InventoryTab" }) });
mock.module("../editWarehouseDialog/index.tsx", { defaultExport: () => ({ type: "EditWarehouseDialog" }) });

describe("WarehouseDetailsDialog Component", () => {
  let WarehouseDetailsDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    WarehouseDetailsDialog = mod.default;
  });

  beforeEach(() => {
    useThemeMock.mock.resetCalls();
    useDictionaryMock.mock.resetCalls();
  });

  describe("WarehouseDetailsDialog() bileşeni", () => {
    it("should_ReturnDialogElement_WhenRenderedWithWarehouseData", async () => {
      // Act
      const element = WarehouseDetailsDialog({ 
        open: true, 
        onClose: () => {}, 
        warehouseData: { id: "wh-1", name: "Main WH", code: "WH-001", city: "Istanbul", country: "Turkey" } 
      });
      
      // Assert
      expect(element).toBeDefined();
    });

    it("should_ReturnNull_WhenWarehouseDataIsMissing", async () => {
      // Act
      const element = WarehouseDetailsDialog({ 
        open: true, 
        onClose: () => {}, 
        warehouseData: null 
      });
      
      // Assert
      expect(element).toBeNull();
    });
  });
});
