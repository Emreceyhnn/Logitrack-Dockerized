"use client";

import { Dialog, DialogContent, Button, Typography, Stack, Box, Alert, CircularProgress, IconButton, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { DriverWithUser } from "@/app/lib/type/vehicle";
import { useAssignDriver } from "@/app/hooks/useAssignDriver";
import CurrentAssignmentSection from "./sections/CurrentAssignmentSection";
import DriverSelectionSection from "./sections/DriverSelectionSection";

interface AssignDriverDialogProps {
  open: boolean;
  onClose: () => void;
  vehicleId: string;
  vehiclePlate: string;
  currentDriver?: DriverWithUser | null;
  onSuccess: () => void;
}

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  error?: {
    _alpha?: Record<string, string>;
  };
}

export default function AssignDriverDialog({ open, onClose, vehicleId, vehiclePlate, currentDriver, onSuccess }: AssignDriverDialogProps) {
  const dict = useDictionary();
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  const { drivers, selectedDriverId, setSelectedDriverId, loading, actionLoading, error, handleAssign, handleUnassign } = useAssignDriver(vehicleId, open, onClose, onSuccess, dict);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { overflow: "hidden" } }}>
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography component="div" variant="h6" fontWeight={800} color="text.primary">{dict.vehicles.dialogs.manageDriver}</Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }} aria-label="close"><CloseIcon fontSize="small" /></IconButton>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block", fontWeight: 500 }}>
          {dict.vehicles.fields.plate}: <span style={{ color: theme.palette.primary.main, fontWeight: 700 }}>{vehiclePlate}</span>
        </Typography>
      </Box>

      <DialogContent sx={{ p: 3, pt: 1 }}>
        {error && (
          <Alert severity="error" variant="filled" sx={{ mb: 3, borderRadius: 2, bgcolor: theme.palette.mode === "dark" ? paletteTheme.error?._alpha?.main_10 : paletteTheme.error?._alpha?.main_05, color: "error.light", border: `1px solid ${paletteTheme.error?._alpha?.main_20}` }}>{error}</Alert>
        )}
        <Stack spacing={4}>
          <CurrentAssignmentSection currentDriver={currentDriver} handleUnassign={handleUnassign} actionLoading={actionLoading} dict={dict} theme={theme} />
          <DriverSelectionSection loading={loading} drivers={drivers} selectedDriverId={selectedDriverId} setSelectedDriverId={setSelectedDriverId} dict={dict} theme={theme} />
        </Stack>
      </DialogContent>

      <Box sx={{ p: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onClose} disabled={actionLoading} sx={{ color: "text.secondary", textTransform: "none", fontWeight: 600 }}>{dict.common.cancel}</Button>
          <Button variant="contained" onClick={handleAssign} disabled={!selectedDriverId || actionLoading} sx={{ textTransform: "none", borderRadius: 2, px: 4, boxShadow: `0 8px 24px ${paletteTheme.primary?._alpha?.main_20}`, fontWeight: 700, minWidth: 140 }}>
            {actionLoading ? <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={16} color="inherit" /><span>{dict.vehicles.dialogs.assigning}</span></Stack> : dict.vehicles.dialogs.assignDriver}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
