 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";
import { renderToString } from "react-dom/server";
import React from "react";
global.React = React;

// MOCKLAR
const useDictionaryMock = mock.fn(() => ({
  common: { na: "N/A" },
  drivers: { card: { license: "Lic {type}", vehicle: "Veh {plate}", noVehicle: "No Veh" } }
}));

mock.module("../../lib/language/DictionaryContext.tsx", { namedExports: { useDictionary: useDictionaryMock } });
mock.module("./card.tsx", { defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="CustomCard">{children}</div> });
mock.module("../rating.tsx", { defaultExport: () => <div data-testid="CustomRating" /> });

mock.module("@mui/material", {
  namedExports: {
    Avatar: () => <div data-testid="Avatar" />,
    Stack: ({ children  }: Record<string, unknown>) => <div data-testid="Stack">{children}</div>,
    Typography: ({ children  }: Record<string, unknown>) => <div data-testid="Typography">{children}</div>
  }
});

describe("DriverCard Component", () => {
  let DriverCard: unknown;

  before(async () => {
    const mod = await import("./driverCard");
    DriverCard = mod.default;
  });

  beforeEach(() => {
    useDictionaryMock.mock.resetCalls();
  });

  describe("DriverCard() bileşeni", () => {
    it("should_RenderDriverInfo_WhenValidDataProvided", async () => {
      let error = null;
      let html = "";
      try {
        html = renderToString(
          <DriverCard 
            user={{ name: "John", surname: "Doe", avatarUrl: "" } as unknown}
            rating={4}
            employeeId="EMP123"
            licenseType="B"
            currentVehicle={{ plate: "34ABC123" } as unknown}
          />
        );
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeNull();
      expect(html).toContain("John");
      expect(html).toContain("Doe");
      expect(html).toContain("EMP123");
      expect(html).toContain("Lic B");
      expect(html).toContain("Veh 34ABC123");
    });
  });
});
