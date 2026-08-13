 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import dayjs from "dayjs";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  vehicles: {
    dashboard: {
      expiringSoon: "Expiring Soon",
    },
    docTypes: {
      INSURANCE: "Insurance",
      INSPECTION: "Inspection",
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: {
    useDictionary: useDictionaryMock,
    useLanguage: () => ({ lang: "en", dict: useDictionaryMock() }),
  },
});

mock.module("next/navigation", {
  namedExports: {
    useParams: mock.fn(() => ({ lang: "en" }))
  }
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="custom-card">{children}</div>,
});

// Mock MUI Date Pickers to just render the custom day slot with today's date for testing the tooltip/badge
mock.module("@mui/x-date-pickers/DateCalendar", {
  namedExports: {
    DateCalendar: ({ slots  }: Record<string, unknown>) => {
      const DayComponent = slots?.day;
      if (DayComponent) {
        return (
          <div data-testid="calendar-mock">
            <DayComponent day={dayjs("2026-05-31")} outsideCurrentMonth={false} />
            <DayComponent day={dayjs("2026-06-01")} outsideCurrentMonth={false} />
          </div>
        );
      }
      return <div data-testid="calendar-mock">No Slots</div>;
    }
  }
});

mock.module("@mui/x-date-pickers/PickersDay", {
  namedExports: {
    PickersDay: ({ day  }: Record<string, unknown>) => <div data-testid={`picker-day-${day.format("YYYY-MM-DD")}`}>{day.format("DD")}</div>
  }
});

mock.module("@mui/x-date-pickers/LocalizationProvider", {
  namedExports: {
    LocalizationProvider: ({ children  }: Record<string, unknown>) => <>{children}</>
  }
});

mock.module("@mui/x-date-pickers/AdapterDayjs", {
  namedExports: {
    AdapterDayjs: class {}
  }
});

// Mock only Tooltip and Badge — no need to spread full @mui/material
mock.module("@mui/material", {
  namedExports: {
    Badge: ({ color, children  }: Record<string, unknown>) => (
      <div data-testid={`badge-${color}`}>
        {children}
      </div>
    ),
    Divider: () => <hr />,
    Tooltip: ({ title, children  }: Record<string, unknown>) => (
      <div data-testid={`tooltip-${title}`}>
        {children}
      </div>
    ),
    Typography: ({ children, sx, ...rest }: unknown) => <span {...rest}>{children}</span>,
  }
});

describe("DocumentCalenderCard RTL Component", () => {
  let DocumentCalenderCard: unknown;

  before(async () => {
    const mod = await import("./documentCalenderCard");
    DocumentCalenderCard = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockDocuments = [
    {
      id: "doc-1",
      plate: "34 ABC 123",
      documentType: "INSURANCE",
      expiryDate: new Date("2026-05-31T10:00:00Z"),
    }
  ];

  const mockMaintenance = [
    {
      id: "maint-1",
      plate: "06 DEF 456",
      serviceType: "Oil Change",
      serviceDate: new Date("2026-05-31T12:00:00Z"),
    }
  ];

  describe("DocumentCalenderCard() bileşeni", () => {
    it("should_RenderCardTitleAndCalendarMock", async () => {
      // Act
      render(<DocumentCalenderCard data={[]} maintenanceData={[]} />);

      // Assert basic renders
      expect(screen.getByText("Expiring Soon")).toBeTruthy();
      expect(screen.getByTestId("calendar-mock")).toBeTruthy();
      expect(screen.getByTestId("picker-day-2026-05-31")).toBeTruthy();
    });

    it("should_RenderTooltipAndBadge_WhenDataExistsOnDay", async () => {
      // Act
      render(<DocumentCalenderCard data={mockDocuments} maintenanceData={mockMaintenance} />);

      // The tooltip should combine localized doc type + plate for both doc and maintenance
      expect(screen.getByTestId("tooltip-Insurance - 34 ABC 123, Oil Change - 06 DEF 456")).toBeTruthy();
      
      // Since it has a document, the badge color should be 'error'
      expect(screen.getByTestId("badge-error")).toBeTruthy();
    });
  });
});
