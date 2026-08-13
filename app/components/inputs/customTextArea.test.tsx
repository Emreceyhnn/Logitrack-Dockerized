 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// MOCKLAR
const useThemeMock = mock.fn(() => ({
  palette: {
    primary: { main: "blue", _alpha: { main_30: "", main_08: "", main_12: "", main_18: "" } },
    text: { secondary: "gray", darkBlue: { _alpha: { main_50: "" } } },
    divider_alpha: { main_10: "" }
  }
}));

// The test invokes the component as a plain function (no render dispatcher), so
// its react hooks (useState/useRef) need stubs.
import * as originalReact from "react";
mock.module("react", {
  namedExports: {
    ...originalReact,
    useState: mock.fn((init: unknown) => [
      typeof init === "function" ? (init as () => unknown)() : init,
      mock.fn(),
    ]),
    useRef: mock.fn(() => ({ current: null })),
  },
});

mock.module("@mui/material", {
  namedExports: {
    useTheme: useThemeMock,
    TextField: (props: Record<string, unknown>) => ({ type: "TextField", props }),
    InputAdornment: (props: Record<string, unknown>) => ({ type: "InputAdornment", props })
  }
});

mock.module("@mui/icons-material/KeyboardArrowDown", { defaultExport: () => ({ type: "KeyboardArrowDownIcon" }) });

describe("CustomTextArea Component", () => {
  let CustomTextArea: unknown;

  before(async () => {
    const mod = await import("./customTextArea");
    CustomTextArea = mod.default;
  });

  beforeEach(() => {
    useThemeMock.mock.resetCalls();
  });

  describe("CustomTextArea() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRenderedAsTextField", async () => {
      // Arrange
      const onChangeMock = mock.fn();

      // Act
      let error = null;
      try {
        CustomTextArea({
          name: "testField",
          value: "testValue",
          onChange: onChangeMock,
          label: "Test Label"
        });
      } catch (e) {
        error = e;
      }

      // Assert
      expect(error).toBeNull();
      expect(CustomTextArea).toBeDefined();
      expect(useThemeMock.mock.calls.length).toBeGreaterThan(0);
    });

    it("should_InitializeWithoutErrors_WhenRenderedAsSelect", async () => {
      // Arrange
      const onChangeMock = mock.fn();

      // Act
      let error = null;
      try {
        CustomTextArea({
          name: "selectField",
          value: "1",
          onChange: onChangeMock,
          select: true
        });
      } catch (e) {
        error = e;
      }

      // Assert
      expect(error).toBeNull();
      expect(useThemeMock.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
