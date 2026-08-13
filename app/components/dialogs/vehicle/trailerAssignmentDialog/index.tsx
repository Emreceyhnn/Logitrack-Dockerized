"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useTrailerMutations } from "@/app/hooks/useTrailers";
import { useVehicles } from "@/app/hooks/useVehicles";
import { TrailerWithRelations } from "@/app/lib/type/trailer";
import { logger } from "@/app/lib/logger";


interface TrailerAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  trailer: TrailerWithRelations | null;
}

export default function TrailerAssignmentDialog({
  open,
  onClose,
  trailer,
}: TrailerAssignmentDialogProps) {
  const dict = useDictionary();
  const { assignTrailer } = useTrailerMutations();
  const { data: vehiclesData, isLoading: isLoadingVehicles } = useVehicles({ status: ["AVAILABLE"] });

  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const handleSubmit = async () => {
    if (!trailer || !selectedVehicleId) return;

    // Close first; the mutation toasts its own success/failure.
    const payload = { trailerId: trailer.id, vehicleId: selectedVehicleId };
    onClose();

    try {
      await assignTrailer.mutateAsync(payload);
    } catch (error) {
      logger.error("Failed to assign trailer:", error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        <Typography component="div" variant="h6" fontWeight={700}>
          {dict.trailers.assignToVehicle}
        </Typography>
        {trailer && (
          <Typography variant="caption" color="text.secondary">
            {trailer.plate} ({dict.trailers.types[trailer.type as keyof typeof dict.trailers.types]})
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mt: 1 }}>
          {isLoadingVehicles ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <TextField
              select
              fullWidth
              label={dict.trailers.currentVehicle}
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              placeholder="Select a vehicle"
            >
              {vehiclesData?.length === 0 ? (
                <MenuItem disabled>No available vehicles</MenuItem>
              ) : (
                vehiclesData?.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.plate} - {v.brand} {v.model}
                  </MenuItem>
                ))
              )}
            </TextField>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: "none" }}>
          {dict.common.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!selectedVehicleId || assignTrailer.isPending}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          {dict.common.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
