"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  MenuItem,
  Stack,
  Typography,
  Box,
  useTheme,
} from "@mui/material";
import { ShipmentStatus } from "@/app/lib/type/enums";
import { SHIPMENT_TRANSITIONS } from "@/app/lib/type/shipmentTransitions";
import { StatusChip } from "@/app/components/chips/statusChips";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import CustomTextArea from "@/app/components/inputs/customTextArea";

interface StatusUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  shipmentId: string | null;
  trackingId?: string | undefined;
  currentStatus: ShipmentStatus | null;
  onSubmit: (args: {
    id: string;
    status: ShipmentStatus;
    description?: string;
  }) => Promise<void> | void;
  submitting?: boolean;
}

/**
 * First-class status transition: shows only the moves that are legal from the
 * current status (per the lifecycle state machine), so the dispatcher can take
 * a DELAYED shipment to IN_TRANSIT/DELIVERED without editing seed-managed
 * fields. FAILED requires a reason (the server enforces this too).
 */
export default function StatusUpdateDialog({
  open,
  onClose,
  shipmentId,
  trackingId,
  currentStatus,
  onSubmit,
  submitting = false,
}: StatusUpdateDialogProps) {
  const dict = useDictionary();
  const theme = useTheme();

  const [nextStatus, setNextStatus] = useState<ShipmentStatus | "">("");
  const [description, setDescription] = useState("");

  // Reset local state whenever a different shipment is opened.
  const [seenId, setSeenId] = useState<string | null>(null);
  if (open && shipmentId !== seenId) {
    setSeenId(shipmentId);
    setNextStatus("");
    setDescription("");
  }

  const options = currentStatus
    ? SHIPMENT_TRANSITIONS[currentStatus] ?? []
    : [];
  const requiresReason = nextStatus === ShipmentStatus.FAILED;
  const canSubmit =
    !!shipmentId &&
    !!nextStatus &&
    (!requiresReason || description.trim().length > 0) &&
    !submitting;

  const statusLabel = (s: ShipmentStatus) =>
    dict.shipments.statuses[
      s.toLocaleUpperCase("en-US") as keyof typeof dict.shipments.statuses
    ] || s.replace(/_/g, " ");

  const handleSubmit = async () => {
    if (!shipmentId || !nextStatus) return;
    await onSubmit({
      id: shipmentId,
      status: nextStatus,
      ...(description.trim() ? { description: description.trim() } : {}),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {dict.shipments.dialogs.updateStatusTitle || "Update status"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          {trackingId && (
            <Typography variant="body2" color="text.secondary">
              {trackingId}
            </Typography>
          )}

          {currentStatus && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {dict.shipments.dialogs.currentStatus || "Current"}:
              </Typography>
              <StatusChip status={currentStatus} />
            </Stack>
          )}

          {options.length === 0 ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: theme.palette.warning._alpha.main_10,
                color: "warning.main",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {dict.shipments.dialogs.noTransitions ||
                "This shipment is in a final state and can't change."}
            </Box>
          ) : (
            <>
              <CustomTextArea
                select
                name="nextStatus"
                label={dict.shipments.dialogs.newStatus || "Yeni durum"}
                value={nextStatus}
                onChange={(e) =>
                  setNextStatus(e.target.value as ShipmentStatus)
                }
              >
                {options.map((s) => (
                  <MenuItem key={s} value={s}>
                    {statusLabel(s)}
                  </MenuItem>
                ))}
              </CustomTextArea>

              <CustomTextArea
                name="description"
                label={
                  (dict.shipments.dialogs.statusNote || "Not") +
                  (requiresReason ? " *" : "")
                }
                placeholder={
                  dict.shipments.dialogs.statusNotePlaceholder ||
                  "Açıklama / Not ekleyin..."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={requiresReason && description.trim().length === 0}
                helperText={
                  requiresReason && description.trim().length === 0
                    ? dict.shipments.dialogs.failureReasonRequired ||
                      "İşlem başarısız olarak işaretlendiğinde neden bildirilmesi zorunludur"
                    : undefined
                }
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          {dict.common.cancel}
        </Button>
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={handleSubmit}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {dict.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
