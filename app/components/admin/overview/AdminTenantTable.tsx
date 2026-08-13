"use client";

import {
  Box,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type { AdminTenantTableProps } from "@/app/lib/type/admin/overview";

/**
 * tr-En aktif kiracılar tablosu.
 * en-Leaderboard of the most active tenants, ranked by shipment volume.
 * input (AdminTenantTableProps)
 * output (JSX.Element)
 */
export default function AdminTenantTable({
  tenants,
  loading,
  locale,
}: AdminTenantTableProps) {
  const theme = useTheme();
  const dict = useDictionary();

  const headCellSx = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
    color: theme.palette.text.secondary,
    borderBottomColor: theme.palette.divider,
    py: 1.25,
  };

  const bodyCellSx = {
    fontSize: 13,
    borderBottomColor: theme.palette.divider,
    py: 1.25,
  };

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper_alpha.main_70,
        backdropFilter: "blur(20px)",
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
          {dict.admin.overview.charts.tenantsTitle}
        </Typography>
        <Typography
          sx={{ fontSize: 12.5, color: theme.palette.text.secondary }}
        >
          {dict.admin.overview.charts.tenantsSubtitle}
        </Typography>
      </Box>

      {loading && tenants.length === 0 ? (
        <Skeleton variant="rounded" height={220} />
      ) : tenants.length === 0 ? (
        <Typography
          sx={{
            fontSize: 13,
            color: theme.palette.text.secondary,
            py: 4,
            textAlign: "center",
          }}
        >
          {dict.admin.common.noData}
        </Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headCellSx}>
                  {dict.admin.overview.table.tenant}
                </TableCell>
                <TableCell align="right" sx={headCellSx}>
                  {dict.admin.overview.table.users}
                </TableCell>
                <TableCell align="right" sx={headCellSx}>
                  {dict.admin.overview.table.shipments}
                </TableCell>
                <TableCell align="right" sx={headCellSx}>
                  {dict.admin.overview.table.created}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow
                  key={tenant.id}
                  sx={{
                    "&:hover": {
                      backgroundColor: theme.palette.background.hoverBg,
                    },
                  }}
                >
                  <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>
                    {tenant.name}
                  </TableCell>
                  <TableCell align="right" sx={bodyCellSx}>
                    {tenant.userCount.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={bodyCellSx}>
                    {tenant.shipmentCount.toLocaleString()}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...bodyCellSx, color: theme.palette.text.secondary }}
                  >
                    {new Date(tenant.createdAt).toLocaleDateString(locale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
