 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const useThemeMock = mock.fn(() => ({
  palette: {
    primary: {
      main: "blue",
      dark: "darkblue",
      _alpha: { main_50: "rgba(0,0,255,0.5)", main_25: "rgba(0,0,255,0.25)" }
    },
    common: { white_alpha: { main_50: "rgba(255,255,255,0.5)" } }
  }
}));

// MUI modülünü mockluyoruz
mock.module("@mui/material", {
  namedExports: { 
    useTheme: useThemeMock,
    Button: (props: Record<string, unknown>) => ({ type: "Button", props }),
    CircularProgress: (props: Record<string, unknown>) => ({ type: "CircularProgress", props }),
    Box: (props: Record<string, unknown>) => ({ type: "Box", props })
  }
});

// Framer Motion modülünü mockluyoruz
mock.module("framer-motion", {
  namedExports: {
    motion: { div: (props: Record<string, unknown>) => ({ type: "MotionDiv", props }) },
    AnimatePresence: (props: Record<string, unknown>) => ({ type: "AnimatePresence", props })
  }
});

describe("AuthButton Component", () => {
  let AuthButton: unknown;

  before(async () => {
    // Modülü mocklamadan sonra yüklüyoruz
    const mod = await import("./AuthButton");
    AuthButton = mod.default;
  });

  beforeEach(() => {
    // Her testten önce mockları sıfırla
    useThemeMock.mock.resetCalls();
  });

  describe("AuthButton() bileşeni", () => {
    it("should_ReturnButtonWithChildren_WhenNotLoading", async () => {
      // Act
      const element = AuthButton({ children: "Giriş Yap", loading: false });
      
      // Assert
      expect(element).toBeDefined();
      expect(typeof element.type).toBe("function");
      expect(element.props.disabled).toBeFalsy();
      
      // useTheme hook'unun çalıştırıldığını doğrula
      expect(useThemeMock.mock.calls.length).toBe(1);
    });

    it("should_ReturnDisabledButton_WhenLoadingIsTrue", async () => {
      // Act
      const element = AuthButton({ children: "Giriş Yap", loading: true, loadingText: "Yükleniyor" });
      
      // Assert
      expect(element.props.disabled).toBe(true);
    });
  });
});
