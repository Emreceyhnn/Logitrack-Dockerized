"use client";

import { useState } from "react";
import {
  Box,
  Button,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import { toast } from "sonner";
import { sendMyEmailVerification } from "@/app/lib/controllers/users";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface VerifyEmailGateProps {
  onClose?: () => void;
}

/**
 * Shown in place of the company form when the founder's address is still
 * unverified. `createCompany` calls requireVerifiedEmail() and would reject the
 * submission anyway — making someone fill in a two-step form, upload a logo and
 * pick regional settings only to be turned away at the end is wasted work, so
 * the gate is surfaced up front with the one action that actually unblocks them.
 */
export default function VerifyEmailGate({ onClose }: VerifyEmailGateProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Resolved by the server action — the session token carries no `email`.
  const [email, setEmail] = useState("");

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await sendMyEmailVerification();
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setEmail(res.email);
      setSent(true);
      toast.success(dict.auth.verifyEmailResent);
    } catch {
      toast.error(dict.auth.verifyEmailError);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <DialogContent sx={{ px: { xs: 3, md: 5 }, py: 4 }}>
        <Stack spacing={2.5} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: theme.palette.primary._alpha.main_10,
              color: theme.palette.primary.main,
            }}
          >
            <MarkEmailReadIcon sx={{ fontSize: 32 }} />
          </Box>

          <Typography variant="h6" fontWeight={800} color="text.primary">
            {dict.auth.verifyEmailGateTitle}
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: "text.secondary", maxWidth: 420, lineHeight: 1.6 }}
          >
            {sent && email
              ? dict.auth.verifyEmailGateSent.replace("{email}", email)
              : dict.auth.verifyEmailGateBody}
          </Typography>

          {sent && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                maxWidth: 420,
                lineHeight: 1.6,
                opacity: 0.8,
              }}
            >
              {dict.auth.verifyEmailResentHint}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 3, md: 5 }, pb: 3, pt: 0 }}>
        <Stack direction="row" spacing={2} justifyContent="flex-end" width="100%">
          {onClose && (
            <Button
              onClick={onClose}
              sx={{
                color: "text.secondary",
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                px: 2,
              }}
            >
              {dict.common.close}
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={sending}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2.5,
              px: 3,
              minWidth: 200,
            }}
          >
            {sending
              ? dict.auth.verifyEmailGateSending
              : sent
                ? dict.auth.verifyEmailResendButton
                : dict.auth.verifyEmailGateSend}
          </Button>
        </Stack>
      </DialogActions>
    </>
  );
}
