"use client";
import {
  Box,
  Divider,
  IconButton,
  Stack,
  Typography,
  useTheme,
  Tooltip,
} from "@mui/material";
import Image from "next/image";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import QrCodeScannerOutlinedIcon from "@mui/icons-material/QrCodeScannerOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { SidebarList } from "./listItem";
import LogoutIcon from "@mui/icons-material/Logout";
import CloseIcon from "@mui/icons-material/Close";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useMemo, useState, useCallback } from "react";
import { clearAuthCookies } from "@/app/lib/controllers/session";
import { buildLocalizedHref, getCanonicalPath } from "@/app/lib/language/navigation";
import LogoutConfirmationDialog from "../dialogs/logoutConfirmationDialog";
import { useGuidedTour } from "@/app/lib/context/GuidedTourContext";
import { getTourStepsForPage } from "@/app/components/guidedTour/tourSteps";
import { logger } from "@/app/lib/logger";


const SideBar = ({
  onMobileClose,
  isDemo = false,
}: {
  onMobileClose?: () => void;
  /** Renders the sidebar for the public Live Demo dashboard: non-built pages
   * are shown but disabled, and logout exits the demo instead of clearing a
   * real session. Defaults to false — real dashboard usage is unaffected. */
  isDemo?: boolean;
}) => {
  /* -------------------------------- variables ------------------------------- */
  const theme = useTheme();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const lang = (params?.lang as string) || "en";
  const dict = useDictionary();
  const { startTour } = useGuidedTour();

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleHelpClick = useCallback(() => {
    // Convert localized pathname back to canonical English paths
    // e.g. /tr/genel-bakis -> /tr/overview -> "overview"
    const canonicalPath = getCanonicalPath(pathname, lang);
    const segments = canonicalPath.split("/").filter(Boolean);
    const pageSegment = segments[segments.length - 1] || "overview";
    
    const steps = getTourStepsForPage(pageSegment, dict as Record<string, unknown>);
    if (steps.length > 0) {
      // Small delay to let the UI render any recently loaded content
      setTimeout(() => startTour(pageSegment, steps), 200);
    }
  }, [pathname, lang, dict, startTour]);

  const handleLogout = async () => {
    // Demo visitors are anonymous — there is no real session to clear.
    // "Logout" here just exits the demo back to the marketing site.
    if (isDemo) {
      router.push(buildLocalizedHref("/", lang));
      return;
    }
    try {
      await clearAuthCookies();
      // Build the localized landing URL
      const logoutHref = buildLocalizedHref("/", lang);
      router.push(logoutHref);
    } catch (error) {
      logger.error("Logout failed:", error);
    }
  };

  const sideBarItemsParents = useMemo(
    () => [
      {
        title: dict.sidebar.overview,
        href: "/overview",
        live: true,
        icon: (
          <SpaceDashboardOutlinedIcon
            sx={{ fontSize: 20, color: theme?.palette?.icon?.secondary }}
          />
        ),
      },
      {
        title: dict.sidebar.operation,
        href: "/vehicle",
        live: true,
        icon: (
          <LocalShippingOutlinedIcon
            sx={{ fontSize: 20, color: theme?.palette?.icon?.secondary }}
          />
        ),
        subTitles: [
          { title: dict.sidebar.vehicles, href: "/vehicle", live: true },
          { title: dict.sidebar.drivers, href: "/drivers", live: true },
          { title: dict.sidebar.routes, href: "/routes", live: true },
          { title: dict.sidebar.shipments, href: "/shipments", live: true },
        ],
      },
      {
        title: dict.sidebar.management,
        href: "/warehouses",
        icon: (
          <WarehouseOutlinedIcon
            sx={{ fontSize: 20, color: theme?.palette?.icon?.secondary }}
          />
        ),
        subTitles: [
          { title: dict.sidebar.warehouses, href: "/warehouses", live: true },
          { title: dict.sidebar.inventory, href: "/inventory", live: true },
          { title: dict.sidebar.customers, href: "/customers", live: true },
          { title: dict.sidebar.company, href: "/company", live: true },
        ],
      },
      {
        title: dict.sidebar.analytics,
        href: "/reports",
        icon: (
          <InsightsOutlinedIcon
            sx={{ fontSize: 20, color: theme?.palette?.icon?.secondary }}
          />
        ),
        subTitles: [
          { title: dict.sidebar.reports, href: "/reports", live: true, disabled: true },
          { title: dict.sidebar.analytics, href: "/analytics", live: true, disabled: true },
        ],
      },
      {
        title: dict.sidebar.warehousePanel,
        href: "/warehouse-worker",
        live: true,
        icon: (
          <QrCodeScannerOutlinedIcon
            sx={{ fontSize: 20, color: theme?.palette?.icon?.secondary }}
          />
        ),
      },
      {
        title: dict.sidebar.driverConsolePanel,
        href: "/driver-console",
        live: true,
        icon: (
          <LocalShippingOutlinedIcon
            sx={{ fontSize: 20, color: theme?.palette?.icon?.secondary }}
          />
        ),
      },
    ],
    [dict, theme]
  );

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        minWidth: 240,
        height: "100dvh",
        backgroundColor:
          theme.palette.mode === "dark"
            ? theme.palette.background.paper_alpha.main_40
            : theme.palette.background.sidebar,
        backdropFilter: "blur(20px)",
        borderRight: `1px solid ${theme.palette.divider_alpha.main_20}`,
        boxShadow:
          theme.palette.mode === "dark"
            ? "4px 0 24px rgba(0,0,0,0.4)"
            : "4px 0 24px rgba(0,0,0,0.02)",
        zIndex: theme.zIndex.drawer + 1,
        transition: "all 0.3s ease",
      }}
    >
      {onMobileClose && (
        <IconButton
          onClick={onMobileClose}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            display: { md: "none" },
            zIndex: 10,
          }}
         aria-label="close">
          <CloseIcon />
        </IconButton>
      )}
      <Stack spacing={1} height={"100%"}>
        <Stack p={2} alignItems={"center"} justifyContent={"center"}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(56, 189, 248, 0.3)",
              }}
            >
              <Image
                src="/logo-white.svg"
                alt="LogiTrack"
                width={22}
                height={22}
              />
            </Box>
            <Typography
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.02em",
                fontSize: 20,
                textTransform: "uppercase",
                color: theme.palette.text.primary,
              }}
            >
              {dict.common.logitrack}
            </Typography>
          </Stack>
        </Stack>
        <Divider sx={{ mx: 2, opacity: 0.5 }} />

        <Stack
          justifyContent={"start"}
          alignItems={"start"}
          height={"100%"}
          pt={1}
        >
          <SidebarList
            items={sideBarItemsParents}
            lang={lang}
            onMobileClose={onMobileClose}
            isDemo={isDemo}
          />

          <Stack
            justifyContent={"start"}
            px={1.5}
            marginTop={"auto"}
            mb={2}
            spacing={0.5}
            width="100%"
          >
            <Tooltip title={dict.common.needHelp} arrow placement="right">
              <IconButton
                onClick={handleHelpClick}
                sx={{
                  width: "100%",
                  justifyContent: "flex-start",
                  borderRadius: "8px",
                  px: 1.5,
                  py: 1,
                  gap: 1.5,
                  color: "text.secondary",
                  ":hover": {
                    backgroundColor: theme.palette.action.hover,
                    color: "text.primary",
                  },
                }}
              >
                <HelpOutlineIcon sx={{ fontSize: 22 }} />
                <Typography sx={{ fontWeight: 500, fontSize: 14 }}>
                  {dict.common.needHelp}
                </Typography>
              </IconButton>
            </Tooltip>

            <Divider sx={{ my: 1, mx: 1.5, opacity: 0.5 }} />

            <Tooltip title={dict.common.logout} arrow placement="right">
              <IconButton
                onClick={() => setLogoutDialogOpen(true)}
                sx={{
                  width: "100%",
                  justifyContent: "flex-start",
                  borderRadius: "8px",
                  px: 1.5,
                  py: 1,
                  gap: 1.5,
                  color: "text.secondary",
                  ":hover": {
                    backgroundColor: theme.palette.error._alpha.main_10,
                    color: theme.palette.error.main,
                  },
                }}
              >
                <LogoutIcon sx={{ fontSize: 22 }} />
                <Typography sx={{ fontWeight: 500, fontSize: 14 }}>
                  {dict.common.logout}
                </Typography>
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>

      <LogoutConfirmationDialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        onConfirm={handleLogout}
      />
    </Box>
  );
};

export default SideBar;
