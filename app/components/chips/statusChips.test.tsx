 
import { describe, it, before, mock } from "node:test";
import { expect } from "expect";
import { renderToString } from "react-dom/server";
import React from "react";
global.React = React;

// MOCKLAR
mock.module("@/app/lib/language/DictionaryContext", {
  namedExports: {
    useLanguage: mock.fn(() => ({ lang: "en", dict: {} })),
  }
});

mock.module("@/app/lib/priorityColor", {
  namedExports: { 
    getStatusMeta: mock.fn((status) => ({ 
      label: `MockLabel-${status}`, 
      paletteKey: "info", 
      color: "#000" 
    })) 
  }
});

mock.module("@mui/material", {
  namedExports: {
    Chip: ({ label  }: Record<string, unknown>) => <div data-testid={`Chip-${label}`}>{label}</div>,
    Tooltip: ({ children, title  }: Record<string, unknown>) => <div data-testid="Tooltip" data-title={title}>{children}</div>,
    useTheme: mock.fn(() => ({
      palette: {
        mode: "light",
        info: { main: "blue", _alpha: { main_10: "rgba(0,0,255,0.1)" } }
      }
    }))
  }
});

describe("StatusChip Component", () => {
  let StatusChip: unknown;

  before(async () => {
    const mod = await import("./statusChips");
    StatusChip = mod.StatusChip || mod.default;
  });

  const senaryolar = [
    { status: "ACTIVE", label: "MockLabel-ACTIVE" },
    { status: "INACTIVE", label: "MockLabel-INACTIVE" }
  ];

  describe("StatusChip() bileşeni", () => {
    senaryolar.forEach(({ status, label }) => {
      it(`should_Render${status}Chip_WhenStatusIs${status}`, async () => {
        let error = null;
        let html = "";
        try {
          html = renderToString(<StatusChip status={status} />);
        } catch (e) {
          error = e;
        }
        
        const upperLabel = label.toLocaleUpperCase();
        expect(error).toBeNull();
        expect(html).toContain(label);
        expect(html).toContain(`data-testid="Chip-${upperLabel}"`);
        expect(html).toContain(`data-title="${label}"`);
      });
    });
  });
});
