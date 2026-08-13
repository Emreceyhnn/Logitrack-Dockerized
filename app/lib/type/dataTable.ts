import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Column definition
// ---------------------------------------------------------------------------

export interface DataTableColumn<TRow> {
  /** Unique identifier for this column — used as React key */
  key: string;
  /** Header label shown in the <TableHead> */
  label: string;
  align?: "left" | "center" | "right";
  /** Optional fixed width (number = px, string = e.g. "10%") */
  width?: number | string;
  /** Cell renderer — receives the full row object, returns any React node */
  render: (row: TRow) => ReactNode;
  /** Enables sorting logic on column head */
  sortable?: boolean;
  /** Mapping key for backend sorting. Defaults to `key` if not provided. */
  sortKey?: string;
}

// ---------------------------------------------------------------------------
// Toolbar / filter definitions
// ---------------------------------------------------------------------------

export interface FilterOption {
  label: string;
  value: string;
}

export interface DataTableFilter {
  /** Field key — must match the key used in `activeFilters` */
  key: string;
  label: string;
  options: FilterOption[];
  /** Allow multiple selections (default: true) */
  multiple?: boolean;
}

// ---------------------------------------------------------------------------
// Row actions (MoreVert menu items)
// ---------------------------------------------------------------------------

export interface DataTableRowAction<TRow> {
  label: string;
  icon: ReactNode;
  onClick: (row: TRow) => void;
  /** Controls text/icon color in the menu item */
  color?: "default" | "error" | "warning";
  /** Optional callback to hide the action for a specific row */
  hidden?: (row: TRow) => boolean;
}

// ---------------------------------------------------------------------------
// Pagination Meta
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Main component props
// ---------------------------------------------------------------------------

export interface DataTableProps<TRow extends { id: string }> {
  rows: TRow[];
  columns: DataTableColumn<TRow>[];

  // Loading / empty
  /** First load only: there are no rows to show yet, so render the skeleton. */
  loading?: boolean | undefined;
  /**
   * A background refetch is in flight while previous rows are still on screen
   * (filter, sort or page change under keepPreviousData). The table stays
   * readable and only dims slightly — replacing it with a skeleton here throws
   * away data the user can still use and makes filtering feel like a reload.
   */
  refreshing?: boolean | undefined;
  emptyMessage?: string | undefined;

  // Search
  searchValue?: string | undefined;
  searchPlaceholder?: string | undefined;
  onSearchChange?: ((value: string) => void) | undefined;

  // Filters (domain-specific multi-select dropdowns rendered in the toolbar)
  filters?: DataTableFilter[] | undefined;
  activeFilters?: Record<string, string[]> | undefined;
  onFilterChange?: ((key: string, values: string[]) => void) | undefined;

  // Row actions rendered as a MoreVert context menu in the last column
  rowActions?: DataTableRowAction<TRow>[] | undefined;

  /** Rows for which this returns true render dimmed with hover disabled (e.g. completed/finalized records). */
  getRowDisabled?: ((row: TRow) => boolean) | undefined;

  // Pagination support
  meta?: PaginationMeta | undefined;
  onPageChange?: ((page: number) => void) | undefined;
  onLimitChange?: ((limit: number) => void) | undefined;

  // Sorting
  sortField?: string | undefined;
  sortOrder?: "asc" | "desc" | undefined;
  onRequestSort?: ((property: string) => void) | undefined;

  // Standardization styling
  tableTitle?: string | undefined;
  wrapCard?: boolean | undefined;
  sx?: import("@mui/material").SxProps<import("@mui/material").Theme> | undefined;
}
