import { Button, CircularProgress, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography, Theme, SxProps } from "@mui/material";
import { Build as AdjustIcon } from "@mui/icons-material";
import { Dictionary } from "@/app/lib/language/language";

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  background?: {
    paper_alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
}

interface StockAdjustmentFormProps {
  adjustAmount: number;
  setAdjustAmount: (value: number) => void;
  adjustType: string;
  setAdjustType: (value: string) => void;
  adjustNote: string;
  setAdjustNote: (value: string) => void;
  onAdjust: () => void;
  isAdjusting: boolean;
  dict: Dictionary;
  theme: Theme;
  fieldSx: SxProps<Theme>;
}

export default function StockAdjustmentForm({ adjustAmount, setAdjustAmount, adjustType, setAdjustType, adjustNote, setAdjustNote, onAdjust, isAdjusting, dict, theme, fieldSx }: StockAdjustmentFormProps) {
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2, bgcolor: paletteTheme.background?.paper_alpha?.main_05, borderColor: paletteTheme.divider_alpha?.main_10, borderRadius: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 2, color: "text.primary", fontWeight: 800, display: "flex", alignItems: "center", gap: 1.5 }}>
        <AdjustIcon sx={{ fontSize: 18, color: "primary.main" }} />
        {dict.inventory.dialogs.quickAdjustment}
      </Typography>
      <Stack spacing={1}>
        <Grid container spacing={1}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label={dict.inventory.dialogs.adjustmentAmount} type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(Number(e.target.value))} variant="outlined" sx={fieldSx} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel sx={{ color: "text.secondary" }}>{dict.inventory.dialogs.adjustmentType}</InputLabel>
              <Select value={adjustType} label={dict.inventory.dialogs.adjustmentType} onChange={(e) => setAdjustType(e.target.value)} sx={{ color: "text.primary" }}>
                <MenuItem value="ADJUSTMENT">{dict.inventory.dialogs.historyTypes?.ADJUSTMENT || "Adjustment"}</MenuItem>
                <MenuItem value="PURCHASE">{dict.inventory.dialogs.historyTypes?.PURCHASE || "Purchase"}</MenuItem>
                <MenuItem value="RETURN">{dict.inventory.dialogs.historyTypes?.RETURN || "Return"}</MenuItem>
                <MenuItem value="DAMAGE">{dict.inventory.dialogs.historyTypes?.DAMAGE || "Damage"}</MenuItem>
                <MenuItem value="LOSS">{dict.inventory.dialogs.historyTypes?.LOSS || "Loss"}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <TextField fullWidth size="small" label={dict.inventory.dialogs.notes} value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} variant="outlined" multiline rows={2} sx={fieldSx} />
        <Button
          fullWidth variant="contained" onClick={onAdjust} disabled={adjustAmount === 0 || isAdjusting}
          startIcon={isAdjusting ? <CircularProgress size={20} color="inherit" /> : <AdjustIcon />}
          sx={{ height: 48, borderRadius: 2.5, background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`, fontWeight: 800, fontSize: "0.95rem", boxShadow: `0 8px 24px ${paletteTheme.primary?._alpha?.main_30}`, textTransform: "none", "&:hover": { boxShadow: `0 12px 32px ${paletteTheme.primary?._alpha?.main_40}`, transform: "translateY(-1px)" }, "&.Mui-disabled": { background: theme.palette.action.disabledBackground, boxShadow: "none", transform: "none" } }}
        >
          {dict.common.apply}
        </Button>
      </Stack>
    </Paper>
  );
}
