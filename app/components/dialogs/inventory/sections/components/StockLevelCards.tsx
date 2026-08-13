import { Avatar, Box, Paper, Stack, Typography, Theme } from "@mui/material";
import { Inventory as InventoryIcon, Warehouse as WarehouseIcon } from "@mui/icons-material";
import { Dictionary } from "@/app/lib/language/language";

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  background?: {
    paper_alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
  error?: {
    _alpha?: Record<string, string>;
  };
  info?: {
    _alpha?: Record<string, string>;
  };
  warning?: {
    _alpha?: Record<string, string>;
  };
  success?: {
    _alpha?: Record<string, string>;
  };
}

interface StockLevelCardsProps {
  item: {
    quantity: number;
    allocatedQuantity?: number | null;
    minStock: number;
    unitValue?: number | null;
    currency?: string | null;
  };
  dict: Dictionary;
  theme: Theme;
  formatFrom: (val: number, cur: string) => string;
}

export default function StockLevelCards({ item, dict, theme, formatFrom }: StockLevelCardsProps) {
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  return (
    <Stack spacing={2} mt={2} mb={2}>
      <Paper variant="outlined" sx={{ p: 2, bgcolor: paletteTheme.background?.paper_alpha?.main_05, borderColor: paletteTheme.divider_alpha?.main_10, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: paletteTheme.primary?._alpha?.main_10, color: theme.palette.primary.main }}><InventoryIcon /></Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{dict.inventory.dialogs.available || "AVAILABLE"}</Typography>
            <Typography variant="h4" fontWeight={800} color="text.primary">{(item.quantity - (item.allocatedQuantity || 0)).toLocaleString("en-US")}</Typography>
          </Box>
        </Stack>
      </Paper>

      {(item.allocatedQuantity || 0) > 0 && (
        <Paper variant="outlined" sx={{ p: 2, bgcolor: paletteTheme.error?._alpha?.main_05, borderColor: paletteTheme.error?._alpha?.main_10, borderRadius: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: paletteTheme.error?._alpha?.main_10, color: theme.palette.error.main }}><InventoryIcon /></Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{dict.inventory.status.blocked || "BLOCKED"}</Typography>
              <Typography variant="h5" fontWeight={800} color="text.primary">{(item.allocatedQuantity ?? 0).toLocaleString("en-US")}</Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2, bgcolor: paletteTheme.background?.paper_alpha?.main_05, borderColor: paletteTheme.divider_alpha?.main_10, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: paletteTheme.info?._alpha?.main_10, color: theme.palette.info.light }}><InventoryIcon /></Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{dict.inventory.dialogs.physical || "PHYSICAL"}</Typography>
            <Typography variant="h4" fontWeight={800} color="text.primary">{item.quantity.toLocaleString("en-US")}</Typography>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, bgcolor: paletteTheme.background?.paper_alpha?.main_05, borderColor: paletteTheme.divider_alpha?.main_10, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: paletteTheme.warning?._alpha?.main_10, color: theme.palette.warning.light }}><WarehouseIcon /></Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{dict.inventory.dialogs.safetyStock}</Typography>
            <Typography variant="h4" fontWeight={800} color="text.primary">{item.minStock.toLocaleString("en-US")}</Typography>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, bgcolor: paletteTheme.success?._alpha?.main_05, borderColor: paletteTheme.success?._alpha?.main_10, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: paletteTheme.success?._alpha?.main_10, color: theme.palette.success.light }}><InventoryIcon /></Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{dict.inventory.fields.unitValue.toLocaleUpperCase('en-US')}</Typography>
            <Typography variant="h4" fontWeight={800} color="text.primary">{formatFrom(item.unitValue || 0, item.currency || "USD")}</Typography>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
