"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  useTheme,
  Divider,
  Box,
  Button,
  LinearProgress,
} from "@mui/material";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { useState, useMemo } from "react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import TableSkeleton from "@/app/components/skeletons/TableSkeleton";
import CustomCard from "@/app/components/cards/card";
import type { DataTableProps } from "@/app/lib/type/dataTable";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import RowMenu from "./RowMenu";
import DataTableToolbar from "./DataTableToolbar";
import { DataTablePagination } from "./DataTablePagination";

function DataTable<TRow extends { id: string }>({
  rows,
  columns,
  loading = false,
  refreshing = false,
  emptyMessage = "No records found",
  searchValue = "",
  searchPlaceholder = "Search...",
  onSearchChange,
  filters = [],
  activeFilters = {},
  onFilterChange,
  rowActions,
  meta,
  onPageChange,
  onLimitChange,
  sortField,
  sortOrder,
  onRequestSort,
  tableTitle,
  wrapCard = false,
  getRowDisabled,
  sx,
}: DataTableProps<TRow>) {
  const theme = useTheme();
  const dict = useDictionary();

  const finalEmptyMessage =
    emptyMessage === "No records found" ? dict.common.noData : emptyMessage;
  const finalSearchPlaceholder =
    searchPlaceholder === "Search..." ? dict.common.search : searchPlaceholder;

  const showToolbar =
    !!onSearchChange || (filters.length > 0 && !!onFilterChange);

  // Stable column helper — must not be recreated on every render or TanStack
  // rebuilds its entire internal state, causing flicker and pagination resets.
  const columnHelper = useMemo(() => createColumnHelper<TRow>(), []);

  const tanstackColumns = useMemo(() => {
    const mapped = columns.map((col) => {
      return columnHelper.display({
        id: col.sortKey || col.key,
        header: () => col.label,
        cell: (info) => col.render(info.row.original),
        enableSorting: !!col.sortable,
        meta: {
          align: col.align,
          width: col.width,
        },
      });
    });

    if (rowActions && rowActions.length > 0) {
      mapped.push(
        columnHelper.display({
          id: "_actions",
          header: () => null,
          cell: (info) => (
            <RowMenu row={info.row.original} actions={rowActions} />
          ),
          enableSorting: false,
          meta: { align: "right" },
        })
      );
    }
    return mapped;
  }, [columns, rowActions, columnHelper]);

  const isServerSide = !!meta;

  const [sorting, setSorting] = useState<SortingState>([]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: tanstackColumns,
    state: {
      // For server-side, always reflect the external sort prop (even when empty).
      // Using `isServerSide && sortField` is wrong because "" is falsy and would
      // fall back to the stale local sorting state.
      sorting: isServerSide
        ? sortField
          ? [{ id: sortField, desc: sortOrder === "desc" }]
          : []
        : sorting,
      ...(isServerSide && meta
        ? {
            pagination: {
              pageIndex: Math.max(0, meta.page - 1),
              pageSize: meta.limit,
            },
          }
        : {}),
    },
    onSortingChange: (updater) => {
      if (isServerSide && onRequestSort) {
        const current = sortField
          ? [{ id: sortField, desc: sortOrder === "desc" }]
          : [];
        const newSorting =
          typeof updater === "function" ? updater(current) : updater;
        // Only propagate when the user actively chose a sort column.
        // When TanStack clears sort (empty array), leave the server-side sort as-is.
        const firstSort = newSorting[0];
        if (firstSort) {
          onRequestSort(firstSort.id);
        }
      } else {
        setSorting(updater);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // getFilteredRowModel is intentionally omitted: DataTable uses display columns
    // (columnHelper.display) whose getValue() returns undefined, so TanStack's
    // globalFilter would hide every row when any search text is present.
    // Filtering is always handled externally — server-side via API params, or
    // client-side by the parent filtering the rows array before passing it in.
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: isServerSide,
    manualSorting: isServerSide,
    ...(isServerSide && meta
      ? { pageCount: Math.ceil(meta.total / meta.limit) }
      : {}),
  });

  const colCount = table.getAllColumns().length;

  const innerContent = (
    <>
      {tableTitle && wrapCard && (
        <>
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 600,
              p: 2,
              pb: showToolbar ? 1 : 2,
            }}
          >
            {tableTitle}
          </Typography>
          {!showToolbar && (
            <Divider
              sx={{ borderColor: theme.palette.divider_alpha.main_10 }}
            />
          )}
        </>
      )}

      {showToolbar && (
        <>
          <DataTableToolbar
            searchValue={searchValue}
            searchPlaceholder={finalSearchPlaceholder}
            onSearchChange={onSearchChange ?? (() => {})}
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={onFilterChange ?? (() => {})}
          />
          <Divider sx={{ borderColor: theme.palette.divider_alpha.main_10 }} />
        </>
      )}

      {loading ? (
        <TableSkeleton rows={10} columns={colCount} />
      ) : (
        <Box sx={{ position: "relative", flex: 1, display: "flex", minHeight: 0 }}>
          {/* Background refetch: a hairline bar instead of a full skeleton, so
              the rows underneath stay readable and in place. */}
          {refreshing && (
            <LinearProgress
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                zIndex: 2,
              }}
            />
          )}
        <TableContainer
          sx={{
            p: 0,
            flex: 1,
            overflowY: "auto",
            // Just enough to signal "updating" without hiding anything.
            opacity: refreshing ? 0.6 : 1,
            transition: "opacity 0.15s ease",
          }}
        >
          <Table size="small">
            <TableHead
              sx={{
                bgcolor: theme.palette.primary._alpha.main_03,
              }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const metaData = header.column.columnDef.meta as
                      | {
                          align?: "left" | "right" | "center";
                          width?: string | number;
                        }
                      | undefined;
                    return (
                      <TableCell
                        key={header.id}
                        align={metaData?.align ?? "left"}
                        width={metaData?.width}
                        sortDirection={header.column.getIsSorted() || false}
                        sx={{
                          borderColor: theme.palette.divider_alpha.main_10,
                        }}
                      >
                        {header.column.getCanSort() ? (
                          <TableSortLabel
                            active={!!header.column.getIsSorted()}
                            direction={header.column.getIsSorted() || "asc"}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableSortLabel>
                        ) : header.isPlaceholder ? null : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableHead>

            <TableBody sx={{ "& tr:last-child td": { border: 0 } }}>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colCount}
                    align="center"
                    sx={{
                      py: 6,
                      borderColor: theme.palette.divider_alpha.main_10,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <InboxOutlinedIcon
                        sx={{ fontSize: 36, color: "text.disabled" }}
                      />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: 13 }}
                      >
                        {finalEmptyMessage}
                      </Typography>
                      {(searchValue ||
                        Object.values(activeFilters).some(
                          (v) => v && v.length > 0
                        )) && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            onSearchChange?.("");
                            if (onFilterChange) {
                              Object.keys(activeFilters).forEach((key) =>
                                onFilterChange(key, [])
                              );
                            }
                          }}
                          sx={{ textTransform: "none", fontWeight: 700 }}
                        >
                          {dict.common.clearFilters}
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const isDisabled = getRowDisabled?.(row.original) ?? false;
                  return (
                  <TableRow
                    key={row.id}
                    hover={!isDisabled}
                    sx={{
                      cursor: "default",
                      opacity: isDisabled ? 0.5 : 1,
                      pointerEvents: isDisabled ? "none" : "auto",
                      transition: "opacity 0.15s ease, background-color 0.15s",
                      "& td": {
                        borderColor: theme.palette.divider_alpha.main_10,
                        fontSize: 13,
                      },
                      "&.MuiTableRow-hover:hover": {
                        bgcolor:
                          theme.palette.primary._alpha.main_08 + " !important",
                        transition: "background-color 0.2s",
                      },
                    }}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const metaData = cell.column.columnDef.meta as
                        | {
                            align?: "left" | "right" | "center";
                            width?: string | number;
                          }
                        | undefined;
                      return (
                        <TableCell
                          key={cell.id}
                          align={metaData?.align ?? "left"}
                          width={metaData?.width}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </Box>
      )}

      {/* Pagination Container */}
      {((isServerSide && meta) || (!isServerSide && rows.length > 0)) &&
        !loading && (
          <DataTablePagination
            isServerSide={isServerSide}
            meta={meta}
            rowsLength={rows.length}
            pageSize={table.getState().pagination.pageSize}
            pageIndex={table.getState().pagination.pageIndex}
            dict={dict}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
            setPageIndex={table.setPageIndex}
            setPageSize={table.setPageSize}
          />
        )}
    </>
  );

  const finalContent = (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "100%", ...sx }}
    >
      {innerContent}
    </Box>
  );

  return wrapCard ? (
    <CustomCard sx={{ padding: 0, overflow: "hidden", height: "100%", ...sx }}>
      {finalContent}
    </CustomCard>
  ) : (
    finalContent
  );
}

export default DataTable;
