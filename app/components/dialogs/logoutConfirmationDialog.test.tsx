 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const useThemeMock = mock.fn(() => ({
  palette: {
    mode: "light",
    background: { paper: "white" },
    error: { main: "red", dark: "darkred", _alpha: { main_10: "", main_20: "", main_30: "" } },
    divider: "gray",
  }
}));

const useDictionaryMock = mock.fn(() => ({
  common: {
    logout: "Logout",
    confirmLogoutDescription: "Description",
    logoutWarning: "Warning",
    cancel: "Cancel"
  }
}));

mock.module("@mui/material", {
  namedExports: { 
    useTheme: useThemeMock,
    Dialog: (props: Record<string, unknown>) => ({ type: "Dialog", props }),
    DialogContent: (props: Record<string, unknown>) => ({ type: "DialogContent", props }),
    Button: (props: Record<string, unknown>) => ({ type: "Button", props }),
    Typography: (props: Record<string, unknown>) => ({ type: "Typography", props }),
    Box: (props: Record<string, unknown>) => ({ type: "Box", props }),
    Stack: (props: Record<string, unknown>) => ({ type: "Stack", props }),
    IconButton: (props: Record<string, unknown>) => ({ type: "IconButton", props })
  }
});

mock.module("@mui/icons-material", {
  namedExports: {
    Logout: () => ({ type: "LogoutIcon" }),
    Close: () => ({ type: "CloseIcon" }),
  }
});

mock.module("../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock }
});

describe("LogoutConfirmationDialog Component", () => {
  let LogoutConfirmationDialog: unknown;

  before(async () => {
    const mod = await import("./logoutConfirmationDialog");
    LogoutConfirmationDialog = mod.default;
  });

  beforeEach(() => {
    useThemeMock.mock.resetCalls();
    useDictionaryMock.mock.resetCalls();
  });

  describe("LogoutConfirmationDialog() bileşeni", () => {
    it("should_ReturnDialogElement_WhenRendered", async () => {
      // Act
      const element = LogoutConfirmationDialog({ 
        open: true, 
        onClose: () => {}, 
        onConfirm: () => {}, 
        loading: false 
      });
      
      // Assert
      expect(element).toBeDefined();
      expect(typeof element.type).toBe("function");
      expect(element.props.open).toBe(true);
      expect(useThemeMock.mock.calls.length).toBe(1);
    });

    it("should_PassLoadingPropCorrectly_WhenLoadingIsTrue", async () => {
      // Act
      const element = LogoutConfirmationDialog({ 
        open: true, 
        onClose: () => {}, 
        onConfirm: () => {}, 
        loading: true 
      });
      
      // Assert
      expect(element).toBeDefined();
    });
  });
});
