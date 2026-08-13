"use client";

import { useEffect, useState } from "react";
import {
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

interface HardDeleteUserDialogProps {
  open: boolean;
  /** The user's own email, echoed for typed confirmation. */
  label: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * tr-Kalıcı silme onay diyaloğu (yalnızca zaten yumuşak silinmiş kullanıcılar için).
 * en-Permanent-erase confirmation dialog, only ever shown for a user that is
 *    already soft-deleted.
 *
 *    Deliberately separate from `DeleteConfirmDialog`: that one always leaves
 *    a way back (`restore`); this one does not, so it gets its own typed
 *    confirmation regardless of entity, not just for companies.
 * input (HardDeleteUserDialogProps)
 * output (JSX.Element)
 */
export default function HardDeleteUserDialog({
  open,
  label,
  busy,
  onCancel,
  onConfirm,
}: HardDeleteUserDialogProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const t = dict.admin.data.deletion;

  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const canConfirm = !busy && typed === label;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <TriangleAlert size={18} color={theme.palette.kpi.error} />
          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
            {t.confirmHardDeleteTitle}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Typography
          sx={{ fontSize: 13.5, color: theme.palette.text.secondary, lineHeight: 1.65 }}
        >
          {t.confirmHardDeleteBody}
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

        <Stack spacing={0.75} sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
            {t.typeToConfirmEmail}
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
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 13,
                },
              },
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCancel} disabled={busy} sx={{ textTransform: "none" }}>
          {t.cancel}
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!canConfirm}
          onClick={onConfirm}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {t.confirmHardDelete}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
