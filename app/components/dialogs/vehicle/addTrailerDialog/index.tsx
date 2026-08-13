"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Grid,
  Typography,
} from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { TrailerType } from "@/app/lib/type/enums";
import { useTrailerMutations } from "@/app/hooks/useTrailers";
import { logger } from "@/app/lib/logger";


interface AddTrailerDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddTrailerDialog({
  open,
  onClose,
  onSuccess,
}: AddTrailerDialogProps) {
  const dict = useDictionary();
  const { createTrailer } = useTrailerMutations();

  const [formData, setFormData] = useState({
    plate: "",
    fleetNo: "",
    type: TrailerType.DRY_VAN as TrailerType,
    capacityVolumeM3: "" as string | number,
    maxLoadKg: "" as string | number,
    isColdChain: false,
  });

  // No submitting flag: the dialog closes on submit, so there is no window in
  // which a "saving…" disabled state could be seen.

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Close and reset up front: the mutation toasts its own outcome, so waiting
    // on the round-trip just leaves the user staring at a spinner.
    const payload = {
      ...formData,
      capacityVolumeM3: Number(formData.capacityVolumeM3),
      maxLoadKg: Number(formData.maxLoadKg),
    };
    onClose();
    setFormData({
      plate: "",
      fleetNo: "",
      type: TrailerType.DRY_VAN,
      capacityVolumeM3: "",
      maxLoadKg: "",
      isColdChain: false,
    });

    try {
      await createTrailer.mutateAsync(payload);
      onSuccess?.();
    } catch (error) {
      logger.error("Failed to create trailer:", error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Typography component="div" variant="h6" fontWeight={700}>
            {dict.trailers.addTrailer}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                required
                fullWidth
                label={dict.trailers.plate}
                name="plate"
                value={formData.plate}
                onChange={handleChange}
                placeholder="34 ABC 123"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={dict.trailers.fleetNo}
                name="fleetNo"
                value={formData.fleetNo}
                onChange={handleChange}
                placeholder="T-001"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                select
                required
                fullWidth
                label={dict.trailers.type}
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                {Object.values(TrailerType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {
                      dict.trailers.types[
                        type as keyof typeof dict.trailers.types
                      ]
                    }
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                required
                fullWidth
                type="number"
                label={dict.trailers.capacity}
                name="capacityVolumeM3"
                value={formData.capacityVolumeM3}
                onChange={handleChange}
                inputProps={{ min: 0, step: "0.1" }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                required
                fullWidth
                type="number"
                label={dict.trailers.maxLoad}
                name="maxLoadKg"
                value={formData.maxLoadKg}
                onChange={handleChange}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="isColdChain"
                    checked={formData.isColdChain}
                    onChange={handleChange}
                  />
                }
                label={dict.trailers.coldChain}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={onClose}
            color="inherit"
            sx={{ textTransform: "none" }}
          >
            {dict.common.cancel}
          </Button>
          <Button
            type="submit"
            variant="contained"
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            {dict.common.save}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
