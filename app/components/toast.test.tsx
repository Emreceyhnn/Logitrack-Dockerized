 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)
const useThemeMock = mock.fn(() => ({
  palette: {
    mode: "light",
    success: { main: "green" },
    info: { main: "blue" },
    warning: { main: "yellow" },
    error: { main: "red" },
    background: { paper: "white" },
    text: { primary: "black" },
    divider: "gray",
  },
  shadows: ["", "", "", "shadow-3"],
  typography: { fontFamily: "Inter, sans-serif" },
}));

// Modülleri Sisteme Enjekte Etme
mock.module("@mui/material/styles", {
  namedExports: { useTheme: useThemeMock },
});

describe("Toast Component", () => {
  let Toaster: unknown;

  before(async () => {
    // Test edilecek modülü mocklardan SONRA dinamik import ile alıyoruz
    const mod = await import("./toast");
    Toaster = mod.Toaster;
  });

  beforeEach(() => {
    // Her testten önce mockları sıfırla
    useThemeMock.mock.resetCalls();
  });

  describe("Toaster() bileşeni", () => {
    it("should_ApplyTheme_AndReturnSonnerToaster", async () => {
      // Act (Eylem)
      const element = Toaster({ position: "top-right" });

      // Assert (Doğrulama)
      expect(element).toBeDefined();
      expect(element.props.position).toBe("top-right");
      expect(element.props.className).toBe("toaster group");
      expect(element.props.theme).toBe("light");

      // useTheme hook'unun çalıştırıldığından emin oluyoruz
      expect(useThemeMock.mock.calls.length).toBe(1);
    });
  });
});
