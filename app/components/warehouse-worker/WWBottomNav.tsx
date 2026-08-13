"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Stack, useTheme } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { View } from "@/app/lib/type/warehouseWorkerClient";
import type { Dictionary } from "@/app/lib/language/language";
import { buildDashboardHomeHref } from "@/app/lib/language/navigation";
import { Ico } from "./Ico";

/** Height reserved for the bar, so scroll containers can pad past it. */
export const WW_BOTTOM_NAV_HEIGHT = 62;

interface WWBottomNavProps {
  locked: boolean;
  lang: string;
  view: View;
  setView: (v: View) => void;
  NAV: { key: View; title: string; d: string }[];
  onHelpClick?: (() => void) | undefined;
  dict?: Dictionary | undefined;
}

/**
 * Mobile counterpart of WWSidebar. The rail is a poor fit on a phone — it eats
 * scarce horizontal space and puts navigation out of thumb reach — so below
 * `md` it is replaced by this fixed bottom bar, the standard pattern for
 * one-handed field use.
 *
 * Only the primary views live here. Back-to-panel and Help are secondary and
 * would crowd the row past comfortable tap targets, so they sit in an overflow
 * slot at the end rather than competing with navigation.
 */
export default function WWBottomNav({
  locked,
  lang,
  view,
  setView,
  NAV,
  onHelpClick,
  dict,
}: WWBottomNavProps) {
  const theme = useTheme();
  const backHref = buildDashboardHomeHref(usePathname(), lang);

  return (
    <Stack
      component="nav"
      direction="row"
      sx={{
        display: { xs: "flex", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        height: WW_BOTTOM_NAV_HEIGHT,
        bgcolor: theme.palette.background.sidebar,
        borderTop: `1px solid ${theme.palette.divider}`,
        // Keeps the bar clear of the iOS home indicator.
        pb: "env(safe-area-inset-bottom)",
        boxSizing: "content-box",
      }}
    >
      {NAV.map((n) => {
        const active = view === n.key;
        return (
          <Stack
            key={n.key}
            component="button"
            type="button"
            onClick={() => setView(n.key)}
            aria-label={n.title}
            aria-current={active ? "page" : undefined}
            alignItems="center"
            justifyContent="center"
            spacing={0.4}
            sx={{
              flex: 1,
              minWidth: 0,
              border: "none",
              font: "inherit",
              cursor: "pointer",
              bgcolor: "transparent",
              color: active ? theme.palette.primary.main : "rgba(255,255,255,0.5)",
              transition: "color .15s",
              // A top rule rather than a filled pill: at this size a background
              // tint on a 5-up row reads as noise.
              borderTop: `2px solid ${active ? theme.palette.primary.main : "transparent"}`,
            }}
          >
            <Ico d={n.d} size={20} />
            <Box
              sx={{
                fontSize: 9.5,
                fontWeight: 800,
                lineHeight: 1,
                maxWidth: "100%",
                px: 0.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {n.title}
            </Box>
          </Stack>
        );
      })}

      {onHelpClick && dict && (
        <Stack
          component="button"
          type="button"
          onClick={onHelpClick}
          aria-label={dict.common?.needHelp || "Need Help"}
          alignItems="center"
          justifyContent="center"
          spacing={0.4}
          sx={{
            width: 54,
            flexShrink: 0,
            border: "none",
            font: "inherit",
            cursor: "pointer",
            bgcolor: "transparent",
            color: "rgba(255,255,255,0.5)",
            borderTop: "2px solid transparent",
          }}
        >
          <HelpOutlineIcon sx={{ fontSize: 20 }} />
          <Box sx={{ fontSize: 9.5, fontWeight: 800, lineHeight: 1 }}>
            {dict.common?.help || "Help"}
          </Box>
        </Stack>
      )}

      {!locked && (
        <Stack
          component={Link}
          href={backHref}
          alignItems="center"
          justifyContent="center"
          spacing={0.4}
          sx={{
            width: 54,
            flexShrink: 0,
            textDecoration: "none",
            color: "rgba(255,255,255,0.5)",
            borderTop: "2px solid transparent",
          }}
        >
          <Ico d="M19 12H5M12 19l-7-7 7-7" size={20} />
          <Box sx={{ fontSize: 9.5, fontWeight: 800, lineHeight: 1 }}>
            {dict?.common?.back || "Back"}
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
