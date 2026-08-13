"use client";

import { Box, Stack, Typography, Divider } from "@mui/material";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useState } from "react";

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void | Promise<void>;
  onError?: () => void;
  disabled?: boolean;
}

/**
 * GoogleSignInButton
 *
 * Renders the real `<GoogleLogin>` button directly (id_token flow) instead of
 * proxying clicks to a hidden instance: Google's button lives in a cross-origin
 * iframe, so a programmatic `.click()` on the wrapper never reaches the actual
 * clickable element inside — the popup silently never opened. Rendering it
 * visibly keeps the click a real, trusted user gesture.
 */
export default function GoogleSignInButton({
  onCredential,
  onError,
  disabled,
}: GoogleSignInButtonProps) {
  const dict = useDictionary();
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setIsLoading(false);
      onError?.();
      return;
    }
    setIsLoading(true);
    try {
      await onCredential(response.credential);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    setIsLoading(false);
    onError?.();
  };

  return (
    <Stack spacing={2.5}>
      {/* ── OR divider ──────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} alignItems="center">
        <Divider sx={{ flex: 1, borderColor: "rgba(255,255,255,0.08)" }} />
        <Typography
          sx={{
            color: "rgba(255,255,255,0.35)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {dict.auth.orContinueWith}
        </Typography>
        <Divider sx={{ flex: 1, borderColor: "rgba(255,255,255,0.08)" }} />
      </Stack>

      {/* ── Real Google button ─────────────────────────────────────────── */}
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          py: 1,
          opacity: disabled || isLoading ? 0.5 : 1,
          pointerEvents: disabled || isLoading ? "none" : "auto",
          "& > div": { transform: "scale(1.15)" },
        }}
      >
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          theme="filled_black"
          shape="pill"
          size="medium"
          width={240}
          text="continue_with"
        />
      </Box>
    </Stack>
  );
}
