"use client";

import { Skeleton } from "@mui/material";

/**
 * Loading placeholder for lazily loaded @mui/x-charts components.
 * Charts are split out of the initial route bundle via next/dynamic —
 * this keeps layout stable while the chart chunk streams in.
 */
export default function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Skeleton
      variant="rectangular"
      width="100%"
      height={height}
      sx={{ borderRadius: 2, mt: 3 }}
    />
  );
}
