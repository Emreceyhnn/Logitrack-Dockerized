 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// Mock NextError
mock.module("next/error", {
  defaultExport: ({ statusCode  }: Record<string, unknown>) => <div data-testid="next-error">Error: {statusCode}</div>,
});

describe("GlobalError Component", () => {
  let GlobalError: unknown;
  let consoleErrorMock: unknown;

  before(async () => {
    const mod = await import("./global-error");
    GlobalError = mod.default;
    consoleErrorMock = mock.method(console, "error", () => {});
  });

  afterEach(() => {
    cleanup();
    consoleErrorMock.mock.resetCalls();
  });

  describe("GlobalError() Render Testleri", () => {
    it("should_RenderGenericError_AndLogToConsole", async () => {
      // Arrange
      const error = new Error("Test Global Error");

      // Act
      render(<GlobalError error={error} />);

      // Assert
      expect(screen.getByTestId("next-error")).toBeTruthy();
      expect(screen.getByText("Error: 0")).toBeTruthy();
      expect(consoleErrorMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
