"use client";

import { Box, Stack, Typography, Button, useTheme } from "@mui/material";
import { useParams, usePathname } from "next/navigation";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SideBar from "@/app/components/sidebar";
import DemoDashboardHeader from "@/app/components/dashboard/DemoDashboardHeader";
import { useUserContext } from "@/app/lib/context/UserContext";
import { GuidedTourProvider } from "@/app/lib/context/GuidedTourContext";
import GuidedTourOverlay from "@/app/components/guidedTour/GuidedTourOverlay";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { buildLocalizedHref } from "@/app/lib/language/navigation";

interface DemoDashboardLayoutClientProps {
  children: React.ReactNode;
}

/**
 * Demo-only counterpart to DashboardLayoutClient: same shell (sidebar +
 * header + content), but the sidebar is rendered in `isDemo` mode and the
 * header is the mutation-safe DemoDashboardHeader. Adds a sticky banner
 * announcing the live demo with a CTA back to sign-up/pricing.
 */
export default function DemoDashboardLayoutClient({
  children,
}: DemoDashboardLayoutClientProps) {
  const theme = useTheme();
  const { user } = useUserContext();
  const dict = useDictionary();
  const params = useParams();
  const pathname = usePathname();
  const lang = (params?.lang as string) || "en";

  // The warehouse-worker and driver-console panels are self-contained,
  // full-screen operational UIs with their own sidebar/header — they must NOT
  // inherit the dashboard shell (sidebar + header + banner) or it would double
  // up. Render bare, keeping only the tour provider their Help button relies on.
  const isFullScreenPanel =
    pathname?.includes("/demo/warehouse-worker") ||
    pathname?.includes("/demo/driver-console");

  if (isFullScreenPanel) {
    return <GuidedTourProvider>{children}</GuidedTourProvider>;
  }

  return (
    <GuidedTourProvider>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: theme.zIndex.drawer + 2,
          background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
          color: "#fff",
          px: { xs: 2, md: 4 },
          py: 1,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems="center"
          justifyContent="center"
          textAlign="center"
        >
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: 12, sm: 13 } }}>
            {dict.liveDemo.bannerText}
          </Typography>
          <Button
            size="small"
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            component="a"
            href={buildLocalizedHref("/auth/sign-up", lang)}
            sx={{
              bgcolor: "#fff",
              color: "#4c1d95",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              px: 2,
              "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
            }}
          >
            {dict.liveDemo.bannerCta}
          </Button>
        </Stack>
      </Box>

      <Box
        display="flex"
        sx={{
          backgroundColor: theme.palette.background.dashboardBg,
          minHeight: "100vh",
        }}
      >
        <Box
          component="nav"
          sx={{
            display: { xs: "none", md: "block" },
            width: 240,
            flexShrink: 0,
            position: "relative",
            zIndex: theme.zIndex.drawer,
          }}
        >
          <SideBar isDemo />
        </Box>
        <Box
          component="main"
          id="main-content"
          sx={{
            flexGrow: 1,
            width: { xs: "100%", md: "calc(100% - 240px)" },
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DemoDashboardHeader user={user} />
          <Box sx={{ flexGrow: 1 }}>{children}</Box>
        </Box>
      </Box>
      <GuidedTourOverlay />
    </GuidedTourProvider>
  );
}
