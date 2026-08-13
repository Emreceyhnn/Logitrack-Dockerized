"use client";

import { Box, Stack, Typography, Card, Button, Avatar, useTheme } from "@mui/material";
import { Ico } from "./Ico";
import { zoneLabel } from "@/app/lib/utils/warehouseWorkerUi";
import type {
  LowStockItem,
  WarehouseWorkerDict,
} from "@/app/lib/type/warehouseWorkerClient";

interface WWLowStockCardProps {
  ww: WarehouseWorkerDict;
  lowStock: LowStockItem[];
  onRestock: (item: { sku: string; zone: string; suggestedQty?: number }) => void;
}

/**
 * Proactive shortage panel: the SKUs already at/below their reorder point, so a
 * worker doesn't have to scan each item to discover it ran low. Each row files a
 * SKU-scoped restock request for the suggested quantity, replacing the vague
 * zone-wide ask with "this product, this many".
 */
export default function WWLowStockCard({
  ww,
  lowStock,
  onRestock,
}: WWLowStockCardProps) {
  const theme = useTheme();

  return (
    <Card
      data-tour="ww-low-stock"
      sx={{
        bgcolor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderRadius: 3,
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar
            sx={{
              bgcolor: `${theme.palette.kpi.amber}1f`,
              color: theme.palette.kpi.amber,
              borderRadius: 2,
            }}
          >
            <Ico d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={19} />
          </Avatar>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
            {ww.ui.lowStockTitle}
          </Typography>
        </Stack>
        {lowStock.length > 0 && (
          <Box
            sx={{
              color: theme.palette.kpi.amber,
              bgcolor: `${theme.palette.kpi.amber}1f`,
              px: 1,
              py: 0.5,
              borderRadius: 1.5,
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {lowStock.length}
          </Box>
        )}
      </Stack>

      {lowStock.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
          {ww.ui.lowStockNone}
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {lowStock.map((it) => (
            <Stack
              key={it.sku}
              direction="row"
              alignItems="center"
              spacing={1.5}
              // Below ~360px the item name and the Restock button can't share a
              // line without truncating the name past recognition — let the
              // button drop instead.
              flexWrap="wrap"
              useFlexGap
              sx={{
                p: 1.25,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.03)",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
                  {it.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.text.secondary, fontFamily: "monospace" }}
                >
                  {it.sku} · {ww.ui.zone} {zoneLabel(it.zone, ww)}
                </Typography>
                {/* available / minStock makes the deficit explicit. */}
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: theme.palette.kpi.amber, mt: 0.25 }}>
                  {it.available} / {it.minStock} {ww.ui.lowStockUnitsLeft}
                </Typography>
              </Box>
              <Button
                onClick={() =>
                  onRestock({ sku: it.sku, zone: it.zone, suggestedQty: it.suggestedQty })
                }
                startIcon={<Ico d="M12 3v11M8 10l4 4 4-4M4 21h16" size={15} />}
                sx={{
                  flexShrink: 0,
                  py: 1,
                  px: 1.5,
                  borderRadius: 2,
                  bgcolor: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.22)",
                  color: theme.palette.kpi.cyan,
                  fontWeight: 700,
                  textTransform: "none",
                  fontSize: 12,
                }}
              >
                {ww.ui.restockSku} {it.suggestedQty}
              </Button>
            </Stack>
          ))}
        </Stack>
      )}
    </Card>
  );
}
