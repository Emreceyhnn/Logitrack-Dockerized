"use client";

import type { ReactNode } from "react";
import {
  Alert,
  Box,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

export interface AdminTableColumn {
  id: string;
  label: string;
  align?: "left" | "right" | "center";
  width?: number | string;
}

interface AdminTableShellProps {
  columns: AdminTableColumn[];
  /** Rendered rows. Empty triggers the empty state. */
  children: ReactNode;
  loading: boolean;
  error: string | null;
  /** Number of rows currently rendered, used to pick loading vs empty state. */
  rowCount: number;
  /** Skeleton rows to show on first load. */
  skeletonRows?: number;
  emptyMessage?: string;
}

/**
 * tr-Yönetim tabloları için ortak kabuk.
 * en-Shared table shell for the admin data screens: handles the loading,
 *    error and empty states in one place so each screen only supplies rows.
 * input (AdminTableShellProps)
 * output (JSX.Element)
 */
export default function AdminTableShell({
  columns,
  children,
  loading,
  error,
  rowCount,
  skeletonRows = 6,
  emptyMessage,
}: AdminTableShellProps) {
  const theme = useTheme();
  const dict = useDictionary();

  const headCellSx = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
    color: theme.palette.text.secondary,
    borderBottomColor: theme.palette.divider,
    whiteSpace: "nowrap" as const,
    py: 1.25,
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper_alpha.main_70,
          backdropFilter: "blur(20px)",
          // Wide tables scroll inside their own container rather than pushing
          // the page sideways.
          overflowX: "auto",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align ?? "left"}
                  sx={{ ...headCellSx, width: column.width }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && rowCount === 0
              ? Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        sx={{ borderBottomColor: theme.palette.divider }}
                      >
                        <Skeleton height={20} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rowCount === 0
                ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        sx={{ border: "none" }}
                      >
                        <Stack alignItems="center" sx={{ py: 5 }}>
                          <Typography
                            sx={{
                              fontSize: 13,
                              color: theme.palette.text.secondary,
                            }}
                          >
                            {emptyMessage ?? dict.admin.common.noData}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                : children}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
