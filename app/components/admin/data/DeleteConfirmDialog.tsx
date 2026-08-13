"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { TriangleAlert } from "lucide-react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type { DeletableEntity } from "@/app/lib/type/admin/deletion";

interface DeleteConfirmDialogProps {
  open: boolean;
  entity: DeletableEntity;
  /** The record's own label, echoed for typed confirmation. */
  label: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  /** Receives the typed confirmation when one was required. */
  onConfirm: (confirmLabel?: string) => void;
}

/**
 * tr-Silme onay diyaloğu.
 * en-Delete confirmation dialog.
 *
 *    Companies require the operator to retype the tenant name: deleting one
 *    hides the company and every user in it, which is too destructive to sit
 *    behind a single click. Everything else takes a plain confirm.
 * input (DeleteConfirmDialogProps)
 * output (JSX.Element)
 */
export default function DeleteConfirmDialog({
  open,
  entity,
  label,
  busy,
  error,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const t = dict.admin.data.deletion;

  const needsTypedConfirmation = entity === "company";
  const [typed, setTyped] = useState("");

  // Reset on each open so a previous attempt's text is never pre-filled into
  // a new confirmation.
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const canConfirm =
    !busy && (!needsTypedConfirmation || typed === label);

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 3 } },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <TriangleAlert size={18} color={theme.palette.kpi.error} />
          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
            {needsTypedConfirmation ? t.confirmCompanyTitle : t.confirmTitle}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Typography
          sx={{
            fontSize: 13.5,
            color: theme.palette.text.secondary,
            lineHeight: 1.65,
          }}
        >
          {needsTypedConfirmation ? t.confirmCompanyBody : t.confirmBody}
        </Typography>

        <Typography
          sx={{
            mt: 1.5,
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            backgroundColor: alpha(theme.palette.kpi.error, 0.08),
            border: `1px solid ${alpha(theme.palette.kpi.error, 0.2)}`,
            wordBreak: "break-all",
          }}
        >
          {label}
        </Typography>

        {needsTypedConfirmation && (
          <Stack spacing={0.75} sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
              {t.typeToConfirm}
            </Typography>
            <TextField
              size="small"
              fullWidth
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy}
              slotProps={{
                htmlInput: {
                  style: {
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 13,
                  },
                },
              }}
            />
          </Stack>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Typography
          sx={{
            mt: 2,
            fontSize: 11.5,
            color: theme.palette.text.secondary,
            lineHeight: 1.6,
          }}
        >
          {t.softDeleteNotice}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={onCancel}
          disabled={busy}
          sx={{ textTransform: "none" }}
        >
          {t.cancel}
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!canConfirm}
          onClick={() =>
            onConfirm(needsTypedConfirmation ? typed : undefined)
          }
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {t.confirmDelete}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
