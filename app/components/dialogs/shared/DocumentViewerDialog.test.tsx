 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts
const useDictionaryMock = mock.fn(() => ({
  documentViewer: {
    pdfDocument: "PDF Document",
    imageFile: "Image File",
    openInNewTab: "Open in new tab",
    downloadFile: "Download",
    loading: "Loading preview...",
    previewUnavailable: "Preview Unavailable",
    previewError: "Error loading preview",
    openInSecureViewer: "Open in Secure Viewer",
  },
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#1976d2" } as unknown,
    success: { main: "#2e7d32" } as unknown,
    error: { main: "#d32f2f" } as unknown,
    divider_alpha: { main_10: "rgba()" } as unknown,
    background: { midnight: { _alpha: { main_80: "rgba()" } } } as unknown,
    common: { white_alpha: { main_10: "rgba()", main_50: "rgba()", main_70: "rgba()" } } as unknown,
  }
});
(customTheme.palette.primary as unknown)._alpha = { main_05: "rgba()", main_10: "rgba()" };
(customTheme.palette.success as unknown)._alpha = { main_05: "rgba()" };
(customTheme.palette.error as unknown)._alpha = { main_10: "rgba()", main_50: "rgba()" };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("DocumentViewerDialog RTL Component", () => {
  let DocumentViewerDialog: unknown;

  before(async () => {
    const mod = await import("./DocumentViewerDialog");
    DocumentViewerDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("DocumentViewerDialog() bileşeni", () => {
    it("should_RenderImage_WhenURLHasImageExtension", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <DocumentViewerDialog open={true} onClose={() => {}} url="https://example.com/test.jpg" title="Invoice Image" />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByText(/Invoice Image/i)).toBeTruthy();
      expect(screen.getByText(/Image File/i)).toBeTruthy();
      
      // Look for the image tag
      const imageElement = document.querySelector("img");
      expect(imageElement).toBeTruthy();
      expect(imageElement?.getAttribute("src")).toBe("https://example.com/test.jpg");
    });

    it("should_RenderIframe_WhenURLHasPDFExtension", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <DocumentViewerDialog open={true} onClose={() => {}} url="https://example.com/doc.pdf" title="Contract PDF" />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByText(/Contract PDF/i)).toBeTruthy();
      expect(screen.getByText(/PDF Document/i)).toBeTruthy();
      
      // Look for the iframe tag
      const iframeElement = document.querySelector("iframe");
      expect(iframeElement).toBeTruthy();
      expect(iframeElement?.getAttribute("src")).toBe("https://example.com/doc.pdf");
    });
  });
});
