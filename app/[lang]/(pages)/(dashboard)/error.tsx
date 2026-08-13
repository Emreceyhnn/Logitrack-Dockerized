"use client";

import { useEffect } from "react";
import { Box } from "@mui/material";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import { logger } from "@/app/lib/logger";


/**
 * Route-level error boundary for the dashboard group. Renders inside the
 * existing layout (sidebar + header stay up), so only the failed page area
 * is replaced with a recoverable error state.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[DashboardError]", error);
  }, [error]);

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      width="100%"
      minHeight="60vh"
    >
      <QueryErrorState onRetry={reset} />
    </Box>
  );
}
