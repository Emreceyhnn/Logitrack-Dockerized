import {
  TableBody,
  TableRow,
  TableCell,
  Box,
  Typography,
  Button,
  useTheme,
} from "@mui/material";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { flexRender, Table } from "@tanstack/react-table";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface DataTableBodyProps<TRow> {
  table: Table<TRow>;
  colCount: number;
  finalEmptyMessage: string;
  searchValue: string;
  activeFilters: Record<string, string[]>;
  onSearchChange?: (value: string) => void;
  onFilterChange?: (key: string, values: string[]) => void;
}

export function DataTableBody<TRow>({
  table,
  colCount,
  finalEmptyMessage,
  searchValue,
  activeFilters,
  onSearchChange,
  onFilterChange,
}: DataTableBodyProps<TRow>) {
  const theme = useTheme();
  const dict = useDictionary();

  return (
    <TableBody sx={{ "& tr:last-child td": { border: 0 } }}>
      {table.getRowModel().rows.length === 0 ? (
        <TableRow>
          <TableCell
            colSpan={colCount}
            align="center"
            sx={{
              py: 6,
              borderColor: theme.palette.divider_alpha?.main_10 || theme.palette.divider,
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
        table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            hover
            sx={{
              cursor: "default",
              "& td": {
                borderColor: theme.palette.divider_alpha?.main_10 || theme.palette.divider,
                fontSize: 13,
              },
              "&.MuiTableRow-hover:hover": {
                bgcolor:
                  theme.palette.primary._alpha.main_08 + " !important",
                transition: "background-color 0.2s",
              },
              transition: "background-color 0.15s",
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
        ))
      )}
    </TableBody>
  );
}
