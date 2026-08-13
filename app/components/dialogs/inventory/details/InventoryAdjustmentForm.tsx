"use client";

import {
  Button,
  Stack,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { Build as AdjustIcon } from "@mui/icons-material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface InventoryAdjustmentFormProps {
  adjustAmount: number;
  setAdjustAmount: (v: number) => void;
  adjustType: string;
  setAdjustType: (v: string) => void;
  adjustNote: string;
  setAdjustNote: (v: string) => void;
  onApply: () => void;
  isPending: boolean;
}

/** Quick stock-adjustment form shown inside the inventory details overview. */
export default function InventoryAdjustmentForm({
  adjustAmount,
  setAdjustAmount,
  adjustType,
  setAdjustType,
  adjustNote,
  setAdjustNote,
  onApply,
  isPending,
}: InventoryAdjustmentFormProps) {
  const theme = useTheme();
  const dict = useDictionary();

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      height: 42,
      borderRadius: "10px",
      bgcolor:
        theme.palette.mode === "dark"
          ? "rgba(255, 255, 255, 0.03)"
          : "rgba(0, 0, 0, 0.02)",
      transition: "all 0.2s ease-in-out",
      "& fieldset": { borderColor: theme.palette.divider },
      "&:hover fieldset": { borderColor: theme.palette.text.secondary },
      "&.Mui-focused": {
        bgcolor: "transparent",
        "& fieldset": {
          borderColor: theme.palette.primary.main,
          borderWidth: "2px",
        },
      },
    },
    "& .MuiInputLabel-root": {
      color: theme.palette.text.secondary,
      fontSize: "14px",
      fontWeight: 500,
      transform: "translate(14px, 11px) scale(1)",
    },
    "& .MuiInputLabel-root.MuiInputLabel-shrink": {
      transform: "translate(14px, -9px) scale(0.75)",
    },
    "& .MuiInputLabel-root.Mui-focused": { color: theme.palette.primary.main },
    "& legend": { fontSize: "0.75em" },
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        bgcolor: theme.palette.background.paper_alpha.main_05,
        borderColor: theme.palette.divider_alpha.main_10,
        borderRadius: 3,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          mb: 2,
          color: "text.primary",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <AdjustIcon sx={{ fontSize: 18, color: "primary.main" }} />
        {dict.inventory.dialogs.quickAdjustment}
      </Typography>
      <Stack spacing={1}>
        <Grid container spacing={1}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              label={dict.inventory.dialogs.adjustmentAmount}
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(Number(e.target.value))}
              variant="outlined"
              sx={fieldSx}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel sx={{ color: "text.secondary" }}>
                {dict.inventory.dialogs.adjustmentType}
              </InputLabel>
              <Select
                value={adjustType}
                label={dict.inventory.dialogs.adjustmentType}
                onChange={(e) => setAdjustType(e.target.value)}
                sx={{ color: "text.primary" }}
              >
                <MenuItem value="ADJUSTMENT">
                  {dict.inventory.dialogs.historyTypes?.ADJUSTMENT ||
                    "Adjustment"}
                </MenuItem>
                <MenuItem value="PURCHASE">
                  {dict.inventory.dialogs.historyTypes?.PURCHASE || "Purchase"}
                </MenuItem>
                <MenuItem value="RETURN">
                  {dict.inventory.dialogs.historyTypes?.RETURN || "Return"}
                </MenuItem>
                <MenuItem value="DAMAGE">
                  {dict.inventory.dialogs.historyTypes?.DAMAGE || "Damage"}
                </MenuItem>
                <MenuItem value="LOSS">
                  {dict.inventory.dialogs.historyTypes?.LOSS || "Loss"}
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <TextField
          fullWidth
          size="small"
          label={dict.inventory.dialogs.notes}
          value={adjustNote}
          onChange={(e) => setAdjustNote(e.target.value)}
          variant="outlined"
          multiline
          rows={2}
          sx={fieldSx}
        />
        <Button
          fullWidth
          variant="contained"
          onClick={onApply}
          disabled={adjustAmount === 0 || isPending}
          startIcon={
            isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <AdjustIcon />
            )
          }
          sx={{
            height: 48,
            borderRadius: 2.5,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            fontWeight: 800,
            fontSize: "0.95rem",
            boxShadow: `0 8px 24px ${theme.palette.primary._alpha.main_30}`,
            textTransform: "none",
            "&:hover": {
              boxShadow: `0 12px 32px ${theme.palette.primary._alpha.main_40}`,
              transform: "translateY(-1px)",
            },
            "&.Mui-disabled": {
              background: theme.palette.action.disabledBackground,
              boxShadow: "none",
              transform: "none",
            },
          }}
        >
          {dict.common.apply}
        </Button>
      </Stack>
    </Paper>
  );
}
