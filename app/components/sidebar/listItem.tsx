"use client";

import { ReactNode, useState, useCallback, useMemo, memo } from "react";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  useTheme,
  Box,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildLocalizedHref } from "@/app/lib/language/navigation";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

/* -------------------------------------------------------------------------- */
/*  Types                                                                       */
/* -------------------------------------------------------------------------- */

export type SidebarItem = {
  title: string;
  icon: ReactNode;
  href: string;
  /** When rendered in demo mode, marks this item as a fully-built, clickable
   * demo page. Items without this flag still render (for visual fidelity)
   * but are visually disabled and non-navigating. Ignored outside demo mode. */
  live?: boolean;
  /** Disables this item in the real (non-demo) dashboard too — reduced
   * opacity, "Soon" chip, no navigation. Use for features that are not yet
   * built and shouldn't be reachable by real users. */
  disabled?: boolean;
  subTitles?: { title: string; href: string; live?: boolean; disabled?: boolean }[];
};

export type Params = {
  items: SidebarItem[];
  lang: string;
  onMobileClose?: (() => void) | undefined;
  /** Renders every href prefixed with /demo and disables non-`live` items
   * (reduced opacity, "Soon" chip, no navigation, disabled-toast on click).
   * Defaults to false — real dashboard usage is unaffected. */
  isDemo?: boolean;
};

/** Prefixes a canonical path with /demo without running it through the
 * localized-slug translator (buildLocalizedHref would rewrite "/overview"
 * into e.g. "/genel-bakis", which has no corresponding folder under
 * app/[lang]/(pages)/demo/). Demo routes are English-only path segments. */
function buildDemoHref(canonicalPath: string, lang: string): string {
  const segments = canonicalPath.split("/").filter(Boolean);
  return `/${lang}/demo/${segments.join("/")}`;
}

/* -------------------------------------------------------------------------- */
/*  SidebarList                                                                 */
/* -------------------------------------------------------------------------- */

export const SidebarList = memo(function SidebarList({
  items,
  lang,
  onMobileClose,
  isDemo = false,
}: Params) {
  const pathname = usePathname();
  const theme = useTheme();
  const dict = useDictionary();

  /* ---------------------------------------------------------------------- */
  /*  Helpers — pure functions, no side effects                               */
  /* ---------------------------------------------------------------------- */

  const resolveHref = useCallback(
    (canonicalPath: string) =>
      isDemo ? buildDemoHref(canonicalPath, lang) : buildLocalizedHref(canonicalPath, lang),
    [isDemo, lang]
  );

  /** True if the sub-item's resolved path matches the current pathname exactly. */
  const isSubActive = useCallback(
    (href: string) => pathname === resolveHref(href),
    [pathname, resolveHref]
  );

  /** True if this parent item (or any of its children) is the active page. */
  const isParentActive = useCallback(
    (item: SidebarItem): boolean => {
      if (item.subTitles?.length) {
        return item.subTitles.some((sub) => isSubActive(sub.href));
      }
      return pathname === resolveHref(item.href);
    },
    [pathname, resolveHref, isSubActive]
  );

  const handleDisabledClick = useCallback(
    (e: React.MouseEvent, reason: "demo" | "notBuilt") => {
      e.preventDefault();
      toast.info(
        reason === "demo"
          ? dict.toasts.demoActionDisabled
          : dict.toasts.featureComingSoon
      );
    },
    [dict]
  );

  /* ---------------------------------------------------------------------- */
  /*  Open-section state                                                       */
  /*                                                                          */
  /*  React 18 "adjusting state during render" pattern:                       */
  /*  – autoOpenKey is derived via useMemo (pure, no side effects)            */
  /*  – when the pathname changes, autoOpenKey changes too                    */
  /*  – we compare it against prevAutoOpenKey stored in state; when they      */
  /*    differ we update both synchronously during this render pass,          */
  /*    triggering an immediate re-render without an extra effect commit.     */
  /* ---------------------------------------------------------------------- */

  const autoOpenKey = useMemo<string | null>(() => {
    for (const item of items) {
      if (isParentActive(item)) return item.href;
    }
    return null;
  }, [items, isParentActive]);

  const [openKey, setOpenKey] = useState<string | null>(autoOpenKey);
  const [prevAutoOpenKey, setPrevAutoOpenKey] = useState<string | null>(
    autoOpenKey
  );

  // Synchronise openKey with pathname changes without an effect.
  if (prevAutoOpenKey !== autoOpenKey) {
    setPrevAutoOpenKey(autoOpenKey);
    setOpenKey(autoOpenKey);
  }

  /* ---------------------------------------------------------------------- */
  /*  Handlers                                                                 */
  /* ---------------------------------------------------------------------- */

  /** Toggle a collapsible parent section open / closed. */
  const handleToggle = useCallback((key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  }, []);

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                   */
  /* ---------------------------------------------------------------------- */

  return (
    <List
      disablePadding
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        width: "100%",
        px: 0,
      }}
    >
      {items.map((item) => {
        const hasChildren = Boolean(item.subTitles?.length);
        const isOpen = openKey === item.href;
        const parentActive = isParentActive(item);
        const resolvedHref = resolveHref(item.href);
        // A parent with children is never itself a nav target (it just
        // toggles the collapse), so it's never "disabled" — only leaf items
        // (no children) can be live/soon in demo mode.
        const parentDisabled =
          (isDemo && !hasChildren && item.live !== true) ||
          (!hasChildren && item.disabled === true);

        return (
          <Box key={item.href} sx={{ width: "100%" }}>
            {/* ---- Parent row ---- */}
            <ListItemButton
              component={hasChildren || parentDisabled ? "div" : Link}
              {...(hasChildren || parentDisabled
                ? {}
                : { href: resolvedHref, prefetch: true })}
              onClick={
                hasChildren
                  ? () => handleToggle(item.href)
                  : parentDisabled
                  ? (e: React.MouseEvent) =>
                      handleDisabledClick(e, item.disabled ? "notBuilt" : "demo")
                  : onMobileClose
              }
              selected={parentActive}
              sx={{
                px: 3,
                py: 1.2,
                borderRadius: "8px",
                mx: 1,
                width: "calc(100% - 16px)",
                transition: "all 0.2s ease-in-out",
                cursor: "pointer",
                opacity: parentDisabled ? 0.5 : 1,
                bgcolor: parentActive
                  ? theme.palette.primary._alpha.main_10
                  : "transparent",
                color: parentActive
                  ? theme.palette.primary.main
                  : "text.secondary",
                "&.Mui-selected": {
                  bgcolor: theme.palette.primary._alpha.main_10,
                  "&:hover": {
                    bgcolor: theme.palette.primary._alpha.main_15,
                  },
                },
                "&:hover": {
                  bgcolor: theme.palette.primary._alpha.main_08,
                  color: theme.palette.primary.main,
                  "& .MuiListItemIcon-root": {
                    color: theme.palette.primary.main,
                  },
                },
                "&:active": {
                  transform: "scale(0.98)",
                  bgcolor: theme.palette.primary._alpha.main_15,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 32,
                  color: parentActive ? theme.palette.primary.main : "inherit",
                  transition: "color 0.2s",
                }}
              >
                {item.icon}
              </ListItemIcon>

              <ListItemText
                primary={item.title}
                primaryTypographyProps={{
                  fontWeight: parentActive ? 700 : 500,
                  fontSize: 14,
                  letterSpacing: "0.01em",
                }}
              />

              {parentDisabled && (
                <Chip
                  label={dict.sidebar.demoSoon}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 10,
                    fontWeight: 600,
                    bgcolor: theme.palette.action.selected,
                    color: "text.secondary",
                  }}
                />
              )}

              {hasChildren && (
                <ExpandMoreIcon
                  sx={{
                    fontSize: 18,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    opacity: 0.7,
                    "&:hover": {
                      opacity: 1,
                      color: theme.palette.primary.main,
                    },
                  }}
                />
              )}
            </ListItemButton>

            {/* ---- Children ---- */}
            {hasChildren && (
              <Collapse in={isOpen} timeout={300} unmountOnExit>
                <List disablePadding sx={{ width: "100%", mt: 0.5 }}>
                  {item.subTitles?.map((sub) => {
                    const subActive = isSubActive(sub.href);
                    const subResolvedHref = resolveHref(sub.href);
                    const subDisabled =
                      (isDemo && sub.live !== true) || sub.disabled === true;

                    return (
                      <ListItemButton
                        key={sub.href}
                        component={subDisabled ? "div" : Link}
                        {...(subDisabled
                          ? {}
                          : { href: subResolvedHref, prefetch: true })}
                        onClick={
                          subDisabled
                            ? (e: React.MouseEvent) =>
                                handleDisabledClick(e, sub.disabled ? "notBuilt" : "demo")
                            : onMobileClose ?? (() => {})
                        }
                        selected={subActive}
                        sx={{
                          pl: 7,
                          py: 0.8,
                          borderRadius: "6px",
                          mx: 1.5,
                          width: "calc(100% - 24px)",
                          transition: "all 0.2s",
                          opacity: subDisabled ? 0.5 : 1,
                          color: subActive
                            ? theme.palette.primary.main
                            : "text.secondary",
                          bgcolor: subActive
                            ? theme.palette.primary._alpha.main_08
                            : "transparent",
                          "&.Mui-selected": {
                            bgcolor: theme.palette.primary._alpha.main_08,
                            "&:hover": {
                              bgcolor: theme.palette.primary._alpha.main_12,
                            },
                          },
                          "&:hover": {
                            bgcolor: theme.palette.primary._alpha.main_05,
                            color: theme.palette.primary.main,
                          },
                          "&:active": {
                            transform: "scale(0.97)",
                          },
                        }}
                      >
                        <ListItemText
                          primary={sub.title}
                          primaryTypographyProps={{
                            fontSize: 13,
                            fontWeight: subActive ? 700 : 500,
                          }}
                        />
                        {subDisabled && (
                          <Chip
                            label={dict.sidebar.demoSoon}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              fontWeight: 600,
                              bgcolor: theme.palette.action.selected,
                              color: "text.secondary",
                            }}
                          />
                        )}
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            )}
          </Box>
        );
      })}
    </List>
  );
});
