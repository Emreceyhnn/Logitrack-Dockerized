import { Box, Typography, TablePagination, useTheme } from "@mui/material";

export function DataTablePagination({
  isServerSide,
  meta,
  rowsLength,
  pageSize,
  pageIndex,
  dict,
  onPageChange,
  onLimitChange,
  setPageIndex,
  setPageSize,
}: {
  isServerSide: boolean;
  meta?: { total?: number; limit?: number; page?: number } | null | undefined;
  rowsLength: number;
  pageSize: number;
  pageIndex: number;
  dict: {
    common: {
      pagination: { totalRecords?: string; rowsPerPage?: string; of?: string };
      moreThan?: string;
    };
  } & Record<string, unknown>;
  onPageChange?: ((page: number) => void) | undefined;
  onLimitChange?: ((limit: number) => void) | undefined;
  setPageIndex: (page: number) => void;
  setPageSize: (size: number) => void;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        py: 0.5,
        borderTop: `1px solid ${theme.palette.divider_alpha.main_10}`,
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 1, sm: 0 },
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: 13 }}>
        {(dict.common.pagination.totalRecords || "{count} records").replace(
          "{count}",
          isServerSide ? (meta?.total || 0).toString() : rowsLength.toString()
        )}
      </Typography>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={isServerSide ? meta?.total || 0 : rowsLength}
        rowsPerPage={isServerSide ? meta?.limit || 10 : pageSize}
        page={isServerSide ? Math.max(0, (meta?.page || 1) - 1) : pageIndex}
        onPageChange={(_, newPage) => {
          if (isServerSide && onPageChange) onPageChange(newPage + 1);
          else if (!isServerSide) setPageIndex(newPage);
        }}
        onRowsPerPageChange={(e) => {
          const newLimit = parseInt(e.target.value, 10);
          if (isServerSide && onLimitChange) onLimitChange(newLimit);
          else if (!isServerSide) setPageSize(newLimit);
        }}
        labelRowsPerPage={dict.common.pagination.rowsPerPage}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} ${dict.common.pagination.of} ${
            count !== -1
              ? count
              : dict.common.moreThan?.replace("{count}", to.toString()) || to.toString()
          }`
        }
        sx={{
          borderTop: "none",
          ".MuiTablePagination-toolbar": { pl: 0 },
          ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": { fontSize: 13 },
        }}
      />
    </Box>
  );
}
