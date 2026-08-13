 
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
      paletteKey: "secondary", 
      color: "#000" 
    })) 
  }
});

mock.module("@mui/material", {
  namedExports: {
    Chip: ({ label  }: Record<string, unknown>) => <div data-testid={`Chip-${label}`}>{label}</div>,
  }
});

describe("PriorityChip Component", () => {
  let PriorityChip: unknown;

  before(async () => {
    const mod = await import("./priorityChips");
    PriorityChip = mod.PriorityChip || mod.default;
  });

  const senaryolar = [
    { status: "HIGH", label: "MockLabel-HIGH" },
    { status: "LOW", label: "MockLabel-LOW" }
  ];

  describe("PriorityChip() bileşeni", () => {
    senaryolar.forEach(({ status, label }) => {
      it(`should_Render${status}Chip_WhenStatusIs${status}`, async () => {
        let error = null;
        let html = "";
        try {
          html = renderToString(<PriorityChip status={status} />);
        } catch (e) {
          error = e;
        }
        
        const upperLabel = label.toLocaleUpperCase();
        expect(error).toBeNull();
        expect(html).toContain(upperLabel);
        expect(html).toContain(`data-testid="Chip-${upperLabel}"`);
      });
    });
  });
});
