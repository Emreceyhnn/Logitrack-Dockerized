"use client";

import { Box, Grid, Stack, Typography, useTheme } from "@mui/material";
import { InventoryDetailsProps } from "@/app/lib/type/inventory";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useCurrency } from "@/app/hooks/useCurrency";
import StockLevelCards from "./components/StockLevelCards";
import StockAdjustmentForm from "./components/StockAdjustmentForm";

type InventoryItem = NonNullable<InventoryDetailsProps["item"]>;

interface StockMetricsPanelProps {
  item: InventoryItem;
  adjustAmount: number;
  setAdjustAmount: (value: number) => void;
  adjustType: string;
  setAdjustType: (value: string) => void;
  adjustNote: string;
  setAdjustNote: (value: string) => void;
  onAdjust: () => void;
  isAdjusting: boolean;
}

interface ExtendedPalette {
  divider_alpha?: Record<string, string>;
  background?: {
    default_alpha?: Record<string, string>;
  };
}

export default function StockMetricsPanel({ item, adjustAmount, setAdjustAmount, adjustType, setAdjustType, adjustNote, setAdjustNote, onAdjust, isAdjusting }: StockMetricsPanelProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const { formatFrom } = useCurrency();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;

  const fieldSx = { "& .MuiOutlinedInput-root": { height: 42, borderRadius: "10px", bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)", transition: "all 0.2s ease-in-out", "& fieldset": { borderColor: theme.palette.divider }, "&:hover fieldset": { borderColor: theme.palette.text.secondary }, "&.Mui-focused": { bgcolor: "transparent", "& fieldset": { borderColor: theme.palette.primary.main, borderWidth: "2px" } } }, "& .MuiInputLabel-root": { color: theme.palette.text.secondary, fontSize: "14px", fontWeight: 500, transform: "translate(14px, 11px) scale(1)" }, "& .MuiInputLabel-root.MuiInputLabel-shrink": { transform: "translate(14px, -9px) scale(0.75)" }, "& .MuiInputLabel-root.Mui-focused": { color: theme.palette.primary.main }, "& legend": { fontSize: "0.75em" } };

  return (
    <Grid size={{ xs: 12, md: 5 }}>
      <Box sx={{ p: 4, borderRight: { md: `1px solid ${paletteTheme.divider_alpha?.main_10}` }, bgcolor: paletteTheme.background?.default_alpha?.main_20, height: "100%" }}>
        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: "1px", textTransform: "uppercase" }}>{dict.inventory.dialogs.stockLevels}</Typography>
        
        <StockLevelCards item={item} dict={dict} theme={theme} formatFrom={formatFrom} />
        
        <StockAdjustmentForm adjustAmount={adjustAmount} setAdjustAmount={setAdjustAmount} adjustType={adjustType} setAdjustType={setAdjustType} adjustNote={adjustNote} setAdjustNote={setAdjustNote} onAdjust={onAdjust} isAdjusting={isAdjusting} dict={dict} theme={theme} fieldSx={fieldSx} />
        
        <Box mt={4}>
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: "1px", textTransform: "uppercase" }}>{dict.inventory.dialogs.locationData}</Typography>
          <Stack spacing={2} mt={1.5}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">{dict.inventory.dialogs.warehouseCode}</Typography>
              <Typography variant="body2" fontWeight={600} color="text.primary">{item.warehouse.code}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">{dict.inventory.dialogs.cargoType}</Typography>
              <Typography variant="body2" fontWeight={600} color="text.primary">{dict.inventory?.dialogs?.cargoTypes?.[(item.cargoType || "General") as keyof typeof dict.inventory.dialogs.cargoTypes] || item.cargoType || "General"}</Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Grid>
  );
}
