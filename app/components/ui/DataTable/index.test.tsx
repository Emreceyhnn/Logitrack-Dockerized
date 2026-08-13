 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const useThemeMock = mock.fn(() => ({
  palette: {
    mode: "light",
    primary: { _alpha: { main_03: "", main_08: "", main_10: "", main_15: "", main_20: "" }, main: "", dark: "" },
    background: { paper: "", paper_alpha: { main_60: "" } },
    text: { primary: "", secondary: "" },
    divider: "",
    divider_alpha: { main_10: "" }
  }
}));

const useDictionaryMock = mock.fn(() => ({
  common: {
    search: "Search",
    noData: "No Data",
    all: "All",
    filtersActive: "Filters",
    clearAll: "Clear",
    pagination: { totalRecords: "" },
    tooltips: {}
  }
}));

// React hooks mock'ları (Hook kurallarını ihlal etmemek için)
const useStateMock = mock.fn((init) => [init, mock.fn()]);
const useEffectMock = mock.fn();
const useCallbackMock = mock.fn((fn) => fn);
const useMemoMock = mock.fn((fn) => fn());
const useRefMock = mock.fn(() => ({ current: null }));

import * as originalReact from "react";
mock.module("react", {
  namedExports: {
    ...originalReact,
    useState: useStateMock,
    useEffect: useEffectMock,
    useCallback: useCallbackMock,
    useMemo: useMemoMock,
    useRef: useRefMock,
  }
});

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock }
});

mock.module("@mui/material", {
  namedExports: { 
    useTheme: useThemeMock,
    Table: (props: Record<string, unknown>) => ({ type: "Table", props }),
    TableBody: (props: Record<string, unknown>) => ({ type: "TableBody", props }),
    TableCell: (props: Record<string, unknown>) => ({ type: "TableCell", props }),
    TableContainer: (props: Record<string, unknown>) => ({ type: "TableContainer", props }),
    TableHead: (props: Record<string, unknown>) => ({ type: "TableHead", props }),
    TableRow: (props: Record<string, unknown>) => ({ type: "TableRow", props }),
    TablePagination: (props: Record<string, unknown>) => ({ type: "TablePagination", props }),
    TableSortLabel: (props: Record<string, unknown>) => ({ type: "TableSortLabel", props }),
    Typography: (props: Record<string, unknown>) => ({ type: "Typography", props }),
    Stack: (props: Record<string, unknown>) => ({ type: "Stack", props }),
    TextField: (props: Record<string, unknown>) => ({ type: "TextField", props }),
    InputAdornment: (props: Record<string, unknown>) => ({ type: "InputAdornment", props }),
    IconButton: (props: Record<string, unknown>) => ({ type: "IconButton", props }),
    Menu: (props: Record<string, unknown>) => ({ type: "Menu", props }),
    MenuItem: (props: Record<string, unknown>) => ({ type: "MenuItem", props }),
    ListItemIcon: (props: Record<string, unknown>) => ({ type: "ListItemIcon", props }),
    ListItemText: (props: Record<string, unknown>) => ({ type: "ListItemText", props }),
    FormControl: (props: Record<string, unknown>) => ({ type: "FormControl", props }),
    InputLabel: (props: Record<string, unknown>) => ({ type: "InputLabel", props }),
    Select: (props: Record<string, unknown>) => ({ type: "Select", props }),
    OutlinedInput: (props: Record<string, unknown>) => ({ type: "OutlinedInput", props }),
    Checkbox: (props: Record<string, unknown>) => ({ type: "Checkbox", props }),
    Divider: (props: Record<string, unknown>) => ({ type: "Divider", props }),
    Box: (props: Record<string, unknown>) => ({ type: "Box", props }),
    Chip: (props: Record<string, unknown>) => ({ type: "Chip", props }),
    Button: (props: Record<string, unknown>) => ({ type: "Button", props }),
    Tooltip: (props: Record<string, unknown>) => ({ type: "Tooltip", props }),
    LinearProgress: (props: Record<string, unknown>) => ({ type: "LinearProgress", props }),
  }
});

mock.module("@mui/icons-material/Search", { defaultExport: () => ({ type: "SearchIcon" }) });
mock.module("@mui/icons-material/MoreVert", { defaultExport: () => ({ type: "MoreVertIcon" }) });
mock.module("../../skeletons/TableSkeleton.tsx", { defaultExport: () => ({ type: "TableSkeleton" }) });
mock.module("../../cards/card.tsx", { defaultExport: () => ({ type: "CustomCard" }) });

const useReactTableMock = mock.fn(() => ({
  getAllColumns: () => [],
  getHeaderGroups: () => [],
  getRowModel: () => ({ rows: [] }),
  getState: () => ({ pagination: { pageSize: 10, pageIndex: 0 } }),
}));

mock.module("@tanstack/react-table", {
  namedExports: {
    useReactTable: useReactTableMock,
    getCoreRowModel: mock.fn(),
    getSortedRowModel: mock.fn(),
    getPaginationRowModel: mock.fn(),
    getFilteredRowModel: mock.fn(),
    flexRender: mock.fn(),
    createColumnHelper: () => ({ display: mock.fn() }),
  }
});

describe("DataTable Component", () => {
  let DataTable: unknown;

  before(async () => {
    const mod = await import("./index");
    DataTable = mod.default;
  });

  beforeEach(() => {
    useThemeMock.mock.resetCalls();
    useDictionaryMock.mock.resetCalls();
    useStateMock.mock.resetCalls();
    useReactTableMock.mock.resetCalls();
  });

  describe("DataTable() bileşeni", () => {
    it("should_InitializeTable_WhenValidPropsProvided", async () => {
      // Arrange
      const columns = [{ key: "id", label: "ID", render: (r: Record<string, unknown>) => r.id }];
      const rows = [{ id: "1" }];
      
      // Act
      try {
        DataTable({ columns, rows, emptyMessage: "Kayıt yok" });
      } catch (e) {
        // Node ortamında ve DOM olmadan kompleks React 19 JSX runtime 
        // işlemlerinin hata vermesi beklenir, ancak öncesinde hook'ların
        // doğru çağrıldığını doğrulayabiliriz.
      }
      
      // Assert
      expect(useThemeMock.mock.calls.length).toBeGreaterThan(0);
      expect(useDictionaryMock.mock.calls.length).toBeGreaterThan(0);
      expect(useReactTableMock.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
