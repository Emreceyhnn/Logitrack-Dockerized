import { TableHead, TableRow, TableCell, TableSortLabel, useTheme } from "@mui/material";
import { flexRender, Table } from "@tanstack/react-table";

interface DataTableHeaderProps<TRow> {
  table: Table<TRow>;
}

export function DataTableHeader<TRow>({ table }: DataTableHeaderProps<TRow>) {
  const theme = useTheme();

  return (
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
                  borderColor: theme.palette.divider_alpha?.main_10 || theme.palette.divider,
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
  );
}
