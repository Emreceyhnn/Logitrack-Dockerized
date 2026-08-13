"use client";

import { useMemo, useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Ico } from "./Ico";
import type { WWCatalogItem } from "@/app/lib/type/warehouseWorker";
import type { Zone, WarehouseWorkerDict } from "@/app/lib/type/warehouseWorkerClient";

interface WWRestockDialogProps {
  open: boolean;
  onClose: () => void;
  ww: WarehouseWorkerDict;
  zones: Zone[];
  /** Zone the panel is currently on — the dialog's starting selection. */
  currentZone: string;
  catalog: WWCatalogItem[];
  onSubmit: (item: { sku: string; zone: string; suggestedQty: number }) => void;
  loading?: boolean;
}

/**
 * Turns the vague "restock this zone" ask into a real replenishment request:
 * which SKU, and how many units. A zone is not a replenishment target — a pick
 * face is — so the item is mandatory here and the request can't be sent without
 * one. Quantity defaults to the deficit against the reorder point so the common
 * case is a single confirm.
 */
export default function WWRestockDialog({
  open,
  onClose,
  ww,
  zones,
  currentZone,
  catalog,
  onSubmit,
  loading = false,
}: WWRestockDialogProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [zone, setZone] = useState(currentZone);
  const [item, setItem] = useState<WWCatalogItem | null>(null);
  const [qty, setQty] = useState("");

  // Reopening after a previous request must not inherit the old selection, and
  // the zone has to follow wherever the panel has moved since.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setZone(currentZone);
      setItem(null);
      setQty("");
    }
  }

  // Scoping the picker to the chosen zone keeps the worker from filing a
  // request against an item that physically lives somewhere else.
  const zoneItems = useMemo(
    () => catalog.filter((c) => c.zone === zone),
    [catalog, zone]
  );

  // Bring available back up to the reorder point; 1 when the SKU is untracked
  // (minStock 0) or already at/above it, so the request is never for 0 units.
  const suggestedQty = item ? Math.max(1, item.minStock - item.available) : 1;
  const parsedQty = Number.parseInt(qty, 10);
  const effectiveQty =
    Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : suggestedQty;

  const canSubmit = !!item && !loading;

  const handleSubmit = () => {
    if (!item) return;
    onSubmit({ sku: item.sku, zone, suggestedQty: effectiveQty });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          overflow: "hidden",
          borderRadius: 3,
          bgcolor: theme.palette.background.paper,
          backdropFilter: "blur(20px)",
        },
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                bgcolor: `${theme.palette.kpi.cyan}1f`,
                color: theme.palette.kpi.cyan,
                borderRadius: 2.5,
              }}
            >
              <Ico d="M12 3v11M8 10l4 4 4-4M4 21h16" size={19} />
            </Avatar>
            <Box>
              <Typography component="div" variant="h6" fontWeight={800} color="text.primary">
                {ww.ui.restockDialogTitle}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 600, mt: 0.5, display: "block" }}
              >
                {ww.ui.restockDialogSubtitle}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={onClose}
            size="small"
            disabled={loading}
            aria-label="close"
            sx={{
              color: "text.secondary",
              transition: "all 0.2s",
              "&:hover": { color: "error.main", bgcolor: "error._alpha.main_10" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ p: 3, pt: 1 }}>
        <Stack spacing={2.5}>
          <TextField
            select
            fullWidth
            size="small"
            label={ww.ui.restockDialogZone}
            value={zone}
            onChange={(e) => {
              setZone(e.target.value);
              // The picked item belongs to the previous zone's shelf list.
              setItem(null);
              setQty("");
            }}
            disabled={loading}
          >
            {zones.map((z) => (
              <MenuItem key={z.name} value={z.name}>
                {ww.ui.zone} {z.name}
              </MenuItem>
            ))}
          </TextField>

          <Autocomplete
            options={zoneItems}
            value={item}
            onChange={(_e, next) => {
              setItem(next);
              setQty("");
            }}
            disabled={loading}
            getOptionLabel={(o) => `${o.sku} — ${o.name}`}
            isOptionEqualToValue={(a, b) => a.sku === b.sku}
            noOptionsText={
              zoneItems.length === 0
                ? ww.ui.restockDialogNoItemsInZone
                : ww.ui.restockDialogNoMatch
            }
            renderOption={(props, o) => {
              const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & {
                key: string;
              };
              return (
                <Box component="li" key={key} {...rest}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
                      {o.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontFamily: "monospace" }}
                    >
                      {o.sku} · {o.available} {ww.ui.restockDialogAvailable}
                      {o.minStock > 0 ? ` / ${o.minStock} ${ww.ui.restockDialogMin}` : ""}
                    </Typography>
                  </Box>
                  {o.lowStock && (
                    <Box
                      sx={{
                        flexShrink: 0,
                        ml: 1,
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 1,
                        fontSize: 10,
                        fontWeight: 800,
                        color: theme.palette.kpi.amber,
                        bgcolor: `${theme.palette.kpi.amber}1f`,
                      }}
                    >
                      {ww.ui.lowStockBadge}
                    </Box>
                  )}
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={ww.ui.restockDialogItem}
                placeholder={ww.ui.restockDialogItemPlaceholder}
                size="small"
              />
            )}
          />

          <TextField
            fullWidth
            size="small"
            type="number"
            label={ww.ui.restockDialogQty}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={String(suggestedQty)}
            disabled={loading || !item}
            inputProps={{ min: 1 }}
            helperText={
              item
                ? `${ww.ui.restockDialogSuggested}: ${suggestedQty}`
                : ww.ui.restockDialogSelectItem
            }
          />
        </Stack>
      </DialogContent>

      <Box
        sx={{
          p: 3,
          pt: 2,
          bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            onClick={onClose}
            disabled={loading}
            sx={{
              color: "text.secondary",
              textTransform: "none",
              fontWeight: 600,
              px: 2,
              borderRadius: 2,
              "&:hover": {
                color: "text.primary",
                bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
              },
            }}
          >
            {ww.ui.cancelScan}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
            sx={{
              textTransform: "none",
              borderRadius: 2.5,
              px: 3,
              fontWeight: 700,
              minWidth: 100,
              bgcolor: theme.palette.kpi.cyan,
              color: theme.palette.getContrastText(theme.palette.kpi.cyan),
              "&:hover": { bgcolor: theme.palette.kpi.cyan, filter: "brightness(0.92)" },
            }}
          >
            {loading ? "..." : ww.ui.restockDialogSubmit}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
