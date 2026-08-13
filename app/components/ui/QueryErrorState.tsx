"use client";

import { Box, Button, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface QueryErrorStateProps {
  /** Re-runs the failed query (typically React Query's refetch). */
  onRetry?: () => void;
  /** Compact layout for embedding inside cards/table bodies. */
  dense?: boolean;
}

/**
 * Shared error state for async surfaces. Renders a human-readable message
 * plus a retry action so a failed request never masquerades as "no data".
 */
export default function QueryErrorState({ onRetry, dense }: QueryErrorStateProps) {
  const dict = useDictionary();

  return (
    <Box
      role="alert"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={1.5}
      py={dense ? 4 : 8}
      px={2}
      textAlign="center"
    >
      <ErrorOutlineIcon color="error" sx={{ fontSize: dense ? 36 : 48 }} />
      <Typography variant={dense ? "subtitle1" : "h6"} sx={{ fontWeight: 700 }}>
        {dict.common.errorState.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={420}>
        {dict.common.errorState.description}
      </Typography>
      {onRetry && (
        <Button
          variant="outlined"
          color="error"
          startIcon={<ReplayIcon />}
          onClick={onRetry}
          sx={{ mt: 1, textTransform: "none", borderRadius: 2 }}
        >
          {dict.common.errorState.retry}
        </Button>
      )}
    </Box>
  );
}
