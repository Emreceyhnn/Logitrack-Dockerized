"use client";

import { Stack, Card, Skeleton, Box, useTheme } from "@mui/material";

interface KpiSkeletonProps {
  count?: number;
}

export default function KpiSkeleton({ count = 6 }: KpiSkeletonProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(4, 1fr)",
          lg: "repeat(15, 1fr)",
        },
        gap: 3,
        mt: 3,
        width: "100%",
        "& > *": {
          display: "flex",
          "& > div": { width: "100%" },
        },
      }}
    >
      {Array.from(new Array(count)).map((_, index) => (
        <Box
          key={index}
          sx={{
            gridColumn: {
              xs: "span 1",
              sm: "span 1",
              md: "span 1",
              lg: index < 5 ? "span 3" : "span 5",
            },
          }}
        >
          <Card
            sx={{
              height: "100%",
              minHeight: "160px",
              width: "100%",
              p: 3,
              borderRadius: "28px",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              backgroundColor: theme.palette.background.paper_alpha.main_80,
              backdropFilter: "blur(20px)",
              border: `1px solid ${theme.palette.divider_alpha.main_10}`,
              boxShadow: `0 10px 40px -10px ${theme.palette.common.black_alpha.main_20}`,
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: `linear-gradient(90deg, ${theme.palette.divider}, ${theme.palette.divider_alpha.main_10})`,
                opacity: 0.5,
              },
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={2}
            >
              <Stack spacing={2} sx={{ flexGrow: 1 }}>
                <Skeleton
                  variant="text"
                  sx={{ fontSize: "0.65rem", width: "120px" }}
                />
                <Skeleton
                  variant="text"
                  sx={{ fontSize: "2rem", width: "60px", height: 40 }}
                />
              </Stack>
              <Skeleton
                variant="rounded"
                width={48}
                height={48}
                sx={{ borderRadius: "20px", opacity: 0.5 }}
              />
            </Stack>
            <Skeleton
              variant="rounded"
              width={100}
              height={24}
              sx={{ borderRadius: "10px", mt: 2, opacity: 0.3 }}
            />
          </Card>
        </Box>
      ))}
    </Box>
  );
}
