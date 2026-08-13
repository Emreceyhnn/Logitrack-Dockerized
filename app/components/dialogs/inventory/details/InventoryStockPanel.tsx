"use client";

import { Box, Stack, Paper, Typography, Avatar, useTheme } from "@mui/material";
import {
  Inventory as InventoryIcon,
  Warehouse as WarehouseIcon,
} from "@mui/icons-material";
import type { InventoryWithRelations } from "@/app/lib/type/inventory";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useCurrency } from "@/app/hooks/useCurrency";
import InventoryAdjustmentForm from "./InventoryAdjustmentForm";

interface InventoryStockPanelProps {
  item: InventoryWithRelations;
  adjustAmount: number;
  setAdjustAmount: (v: number) => void;
  adjustType: string;
  setAdjustType: (v: string) => void;
  adjustNote: string;
  setAdjustNote: (v: string) => void;
  onApply: () => void;
  isPending: boolean;
}

/** Left column of the inventory details overview: stock levels + adjustment. */
export default function InventoryStockPanel({
  item,
  adjustAmount,
  setAdjustAmount,
  adjustType,
  setAdjustType,
  adjustNote,
  setAdjustNote,
  onApply,
  isPending,
}: InventoryStockPanelProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const { formatFrom } = useCurrency();

  return (
    <Box
      sx={{
        p: 4,
        borderRight: {
          md: `1px solid ${theme.palette.divider_alpha.main_10}`,
        },
        bgcolor: theme.palette.background.default_alpha.main_20,
        height: "100%",
      }}
    >
      <Typography
        variant="caption"
        fontWeight={800}
        color="text.secondary"
        sx={{ letterSpacing: "1px", textTransform: "uppercase" }}
      >
        {dict.inventory.dialogs.stockLevels}
      </Typography>

      <Stack spacing={2} mt={2}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: theme.palette.background.paper_alpha.main_05,
            borderColor: theme.palette.divider_alpha.main_10,
            borderRadius: 3,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                bgcolor: theme.palette.primary._alpha.main_10,
                color: theme.palette.primary.main,
              }}
            >
              <InventoryIcon />
            </Avatar>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.inventory.dialogs.available || "AVAILABLE"}
              </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary">
                {(item.quantity - (item.allocatedQuantity || 0)).toLocaleString(
                  "en-US"
                )}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {(item.allocatedQuantity || 0) > 0 && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: theme.palette.error._alpha.main_05,
              borderColor: theme.palette.error._alpha.main_10,
              borderRadius: 3,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: theme.palette.error._alpha.main_10,
                  color: theme.palette.error.main,
                }}
              >
                <InventoryIcon />
              </Avatar>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  {dict.inventory.status.blocked || "BLOCKED"}
                </Typography>
                <Typography variant="h5" fontWeight={800} color="text.primary">
                  {item.allocatedQuantity.toLocaleString("en-US")}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        )}

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: theme.palette.background.paper_alpha.main_05,
            borderColor: theme.palette.divider_alpha.main_10,
            borderRadius: 3,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                bgcolor: theme.palette.info._alpha.main_10,
                color: theme.palette.info.light,
              }}
            >
              <InventoryIcon />
            </Avatar>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.inventory.dialogs.physical || "PHYSICAL"}
              </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary">
                {item.quantity.toLocaleString("en-US")}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <InventoryAdjustmentForm
          adjustAmount={adjustAmount}
          setAdjustAmount={setAdjustAmount}
          adjustType={adjustType}
          setAdjustType={setAdjustType}
          adjustNote={adjustNote}
          setAdjustNote={setAdjustNote}
          onApply={onApply}
          isPending={isPending}
        />

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: theme.palette.background.paper_alpha.main_05,
            borderColor: theme.palette.divider_alpha.main_10,
            borderRadius: 3,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                bgcolor: theme.palette.warning._alpha.main_10,
                color: theme.palette.warning.light,
              }}
            >
              <WarehouseIcon />
            </Avatar>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.inventory.dialogs.safetyStock}
              </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary">
                {item.minStock.toLocaleString("en-US")}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: theme.palette.success._alpha.main_05,
            borderColor: theme.palette.success._alpha.main_10,
            borderRadius: 3,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                bgcolor: theme.palette.success._alpha.main_10,
                color: theme.palette.success.light,
              }}
            >
              <InventoryIcon />
            </Avatar>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.inventory.fields.unitValue.toLocaleUpperCase("en-US")}
              </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary">
                {formatFrom(item.unitValue || 0, item.currency || "USD")}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Stack>

      <Box mt={4}>
        <Typography
          variant="caption"
          fontWeight={800}
          color="text.secondary"
          sx={{ letterSpacing: "1px", textTransform: "uppercase" }}
        >
          {dict.inventory.dialogs.locationData}
        </Typography>
        <Stack spacing={2} mt={1.5}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {dict.inventory.dialogs.warehouseCode}
            </Typography>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {item.warehouse.code}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {dict.inventory.dialogs.cargoType}
            </Typography>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {dict.inventory?.dialogs?.cargoTypes?.[
                (item.cargoType ||
                  "General") as keyof typeof dict.inventory.dialogs.cargoTypes
              ] ||
                item.cargoType ||
                "General"}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
