 
import { describe, it, before, mock } from "node:test";
import { expect } from "expect";
import { renderToString } from "react-dom/server";
import React from "react";
global.React = React;

// MOCKLAR
mock.module("@mui/material", {
  namedExports: {
    ToggleButton: ({ children  }: Record<string, unknown>) => <button data-testid="ToggleButton">{children}</button>,
    ToggleButtonGroup: ({ children  }: Record<string, unknown>) => <div data-testid="ToggleButtonGroup">{children}</div>
  }
});

describe("TimeRangeSelector Component", () => {
  let TimeRangeSelector: unknown;

  before(async () => {
    const mod = await import("./TimeRangeSelector");
    TimeRangeSelector = mod.default;
  });

  const mockDict: unknown = {
    common: { ranges: { "1w": "1 Week", "2w": "2 Weeks", "1m": "1 Month", "6m": "6 Months" } }
  };

  describe("TimeRangeSelector() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", async () => {
      let error = null;
      let html = "";
      try {
        html = renderToString(<TimeRangeSelector value="1w" onChange={() => {}} dict={mockDict} />);
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeNull();
      expect(html).toContain("data-testid=\"ToggleButtonGroup\"");
      expect(html).toContain("1 Week");
    });
  });
});
