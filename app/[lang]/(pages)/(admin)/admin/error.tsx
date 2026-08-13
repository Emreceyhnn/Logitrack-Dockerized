"use client";

import { useEffect } from "react";
import { Box } from "@mui/material";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import { logger } from "@/app/lib/logger";

/**
 * Route-level error boundary for the admin console. Renders inside the console
 * layout (sidebar + header stay up), so a failing page replaces only the main
 * content area instead of blanking the whole console.
 *
 * The error message itself is deliberately not rendered: an admin page can
 * throw with a database or provider error whose message may contain a
 * connection string. `QueryErrorState` shows a generic message and the details
 * go to the server log.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[AdminError]", error);
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
