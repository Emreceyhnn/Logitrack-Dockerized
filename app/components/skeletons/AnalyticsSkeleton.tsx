import { Box, Skeleton, Stack, Typography, Divider } from "@mui/material";
import CustomCard from "../cards/card";

interface AnalyticsSkeletonProps {
  title?: string;
  height?: number;
  showSubtitle?: boolean;
}

export default function AnalyticsSkeleton({
  title = "Analytics Overview",
  height = 300,
  showSubtitle = true,
}: AnalyticsSkeletonProps) {
  return (
    <CustomCard sx={{ flexGrow: 1 }}>
      <Typography variant="h6" fontWeight={700} mb={1}>
        {title}
      </Typography>
      {showSubtitle && (
        <Typography variant="body2" color="text.secondary" mb={3}>
          <Skeleton variant="text" width="40%" />
        </Typography>
      )}
      <Divider sx={{ mb: 3 }} />

      <Box
        sx={{ display: "flex", alignItems: "flex-end", gap: 2, height: height }}
      >
        {Array.from(new Array(12)).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            width={`${100 / 12}%`}
            height={`${((i * 13) % 60) + 20}%`}
            sx={{ borderRadius: "4px 4px 0 0", flexGrow: 1 }}
          />
        ))}
      </Box>
      <Stack direction="row" justifyContent="center" spacing={4} mt={3}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Skeleton variant="circular" width={12} height={12} />
          <Skeleton variant="text" width={60} />
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Skeleton variant="circular" width={12} height={12} />
          <Skeleton variant="text" width={60} />
        </Stack>
      </Stack>
    </CustomCard>
  );
}
