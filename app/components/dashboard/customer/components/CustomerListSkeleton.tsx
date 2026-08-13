import { Box, Stack, Skeleton, Divider, Theme } from "@mui/material";
import CustomCard from "../../../cards/card";

interface ExtendedPalette {
  text?: {
    primary_alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
}

export default function CustomerListSkeleton({ theme }: { theme: Theme }) {
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  return (
    <CustomCard sx={{ width: 400, p: 0, display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      <Box sx={{ p: 3, pb: 0 }}>
        <Skeleton variant="text" width={120} height={32} sx={{ bgcolor: paletteTheme.text?.primary_alpha?.main_10, mb: 1 }} />
        <Skeleton variant="text" width={80} height={20} sx={{ bgcolor: paletteTheme.text?.primary_alpha?.main_05, mb: 2 }} />
        <Divider sx={{ borderColor: paletteTheme.divider_alpha?.main_10, mb: 1 }} />
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", p: 0 }}>
        {Array.from(new Array(5)).map((_, index) => (
          <Box key={index} sx={{ p: 2, borderBottom: "1px solid", borderColor: paletteTheme.divider_alpha?.main_10 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Skeleton variant="rounded" width={40} height={40} sx={{ bgcolor: paletteTheme.text?.primary_alpha?.main_05 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="60%" height={24} sx={{ bgcolor: paletteTheme.text?.primary_alpha?.main_10 }} />
                <Skeleton width="40%" height={16} sx={{ bgcolor: paletteTheme.text?.primary_alpha?.main_05 }} />
              </Box>
            </Stack>
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Skeleton width="80%" height={16} sx={{ bgcolor: paletteTheme.text?.primary_alpha?.main_05 }} />
              <Skeleton width="50%" height={16} sx={{ bgcolor: paletteTheme.text?.primary_alpha?.main_05 }} />
            </Stack>
          </Box>
        ))}
      </Box>
    </CustomCard>
  );
}
