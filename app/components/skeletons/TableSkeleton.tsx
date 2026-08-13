"use client";

import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  SxProps,
  Theme,
  useTheme,
} from "@mui/material";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  title?: string;
  sx?: SxProps<Theme>;
}

export default function TableSkeleton({
  rows = 5,
  columns = 6,
  title,
  sx,
}: TableSkeletonProps) {
  const theme = useTheme();

  return (
    <TableContainer
      sx={[
        { p: title ? 0 : 2, pt: title ? 0 : 3 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Table sx={{ minWidth: 750 }}>
        <TableHead sx={{ bgcolor: theme.palette.primary._alpha.main_03 }}>
          <TableRow>
            {Array.from(new Array(columns)).map((_, i) => (
              <TableCell
                key={i}
                sx={{
                  borderColor: theme.palette.divider_alpha.main_10,
                }}
              >
                <Skeleton
                  variant="text"
                  width="60%"
                  sx={{
                    bgcolor: theme.palette.text.primary_alpha.main_10,
                  }}
                />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody sx={{ "& tr:last-child td": { border: 0 } }}>
          {Array.from(new Array(rows)).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from(new Array(columns)).map((_, colIndex) => (
                <TableCell
                  key={colIndex}
                  sx={{
                    borderColor: theme.palette.divider_alpha.main_10,
                    py: 1.5,
                  }}
                >
                  <Skeleton
                    animation="wave"
                    variant={colIndex === 1 ? "rounded" : "text"}
                    width={colIndex === 1 ? 80 : "80%"}
                    height={colIndex === 1 ? 24 : 24}
                    sx={{
                      bgcolor: theme.palette.text.primary_alpha.main_05,
                      borderRadius: 1,
                    }}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
