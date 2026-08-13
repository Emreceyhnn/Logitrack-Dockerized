"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  IconButton,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Activity,
  Bell,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Database,
  FlaskConical,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Lock,
  Mail,
  Radio,
  Rocket,
  ScrollText,
  Send,
  Settings2,
  ShieldAlert,
  Terminal,
  ToggleLeft,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { stripLocale } from "@/app/lib/admin/nav";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  AdminNavItem,
  AdminSidebarProps,
} from "@/app/lib/type/admin/shell";

export const ADMIN_SIDEBAR_WIDTH = 260;
export const ADMIN_SIDEBAR_COLLAPSED_WIDTH = 72;

// Explicit map rather than a dynamic lookup: keeps tree-shaking effective and
// makes an unknown icon name a visible fallback instead of a runtime crash.
const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  Users,
  KeyRound,
  ScrollText,
  Activity,
  HeartPulse,
  Terminal,
  Database,
  FlaskConical,
  Send,
  Radio,
  Mail,
  ListChecks,
  Bell,
  Settings2,
  ToggleLeft,
  Lock,
  Trash2,
  Rocket,
};

/**
 * tr-İkon adını bileşene çevirir.
 * en-Resolves an icon name to its Lucide component, falling back to a dot.
 * input (name: string)
 * output (LucideIcon)
 */
function resolveIcon(name: string): LucideIcon {
  return ICONS[name] ?? Activity;
}

/**
 * tr-Yönetim konsolu yan menüsü.
 * en-Admin console sidebar: collapsible, grouped, with active-route highlight.
 *    Purely presentational — collapse state is owned by AdminShell.
 * input (AdminSidebarProps)
 * output (JSX.Element)
 */
export default function AdminSidebar({
  nav,
  collapsed,
  onToggle,
  pathname,
  locale,
}: AdminSidebarProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const currentPath = useMemo(() => stripLocale(pathname), [pathname]);

  const renderItem = (item: AdminNavItem, nested: boolean) => {
    const Icon = resolveIcon(item.icon);
    // Exact match only: "/admin" must not stay lit on "/admin/tenants".
    const active = currentPath === item.href;

    const button = (
      <ListItemButton
        component={Link}
        href={`/${locale}${item.href}`}
        selected={active}
        sx={{
          borderRadius: 1.5,
          mb: 0.25,
          minHeight: 40,
          px: collapsed ? 1.5 : 1.5,
          justifyContent: collapsed ? "center" : "flex-start",
          color: active
            ? theme.palette.primary.main
            : theme.palette.text.secondary,
          backgroundColor: active
            ? alpha(theme.palette.primary.main, 0.1)
            : "transparent",
          "&.Mui-selected": {
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.16),
            },
          },
          "&:hover": {
            backgroundColor: theme.palette.background.hoverBg,
            color: theme.palette.text.primary,
          },
          transition: theme.transitions.create(
            ["background-color", "color"],
            { duration: 150 }
          ),
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 34,
            color: "inherit",
            justifyContent: "center",
          }}
        >
          <Icon size={18} strokeWidth={active ? 2.4 : 2} />
        </ListItemIcon>

        {!collapsed && (
          <ListItemText
            primary={item.label}
            slotProps={{
              primary: {
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                noWrap: true,
              },
            }}
          />
        )}

        {!collapsed && item.sensitive && (
          <Tooltip title={dict.admin.common.sensitive} arrow>
            <Box component="span" sx={{ display: "flex", ml: 0.5 }}>
              <ShieldAlert size={13} color={theme.palette.kpi.amber} />
            </Box>
          </Tooltip>
        )}
      </ListItemButton>
    );

    return (
      <Box key={item.id} sx={{ pl: nested && !collapsed ? 0.5 : 0 }}>
        {collapsed ? (
          <Tooltip title={item.label} placement="right" arrow>
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: collapsed ? ADMIN_SIDEBAR_COLLAPSED_WIDTH : ADMIN_SIDEBAR_WIDTH,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.sidebar,
        // Glassmorphic surface: translucent + blur, per the design brief.
        backdropFilter: "blur(12px)",
        transition: theme.transitions.create("width", { duration: 200 }),
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: collapsed ? 0 : 2,
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 1.25,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            background: `linear-gradient(135deg, ${theme.palette.kpi.indigo}, ${theme.palette.kpi.violet})`,
          }}
        >
          <ShieldAlert size={17} color="#fff" />
        </Box>
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              noWrap
              sx={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              {dict.admin.title}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ color: theme.palette.text.secondary, fontSize: 10.5 }}
            >
              {dict.admin.badge}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden", px: 1, py: 1.5 }}>
        {nav.map((group) => {
          if (!group.children?.length) {
            return <List key={group.id} disablePadding>{renderItem(group, false)}</List>;
          }

          return (
            <Box key={group.id} sx={{ mb: 1.5 }}>
              {!collapsed && (
                <Typography
                  variant="overline"
                  sx={{
                    px: 1.5,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    color: theme.palette.text.secondary,
                    opacity: 0.7,
                  }}
                >
                  {group.label}
                </Typography>
              )}
              {collapsed && (
                <Box
                  sx={{
                    height: "1px",
                    backgroundColor: theme.palette.divider,
                    mx: 1.5,
                    my: 1,
                  }}
                />
              )}
              <List disablePadding>
                {group.children.map((child) => renderItem(child, true))}
              </List>
            </Box>
          );
        })}
      </Box>

      {/* Collapse toggle */}
      <Box
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          p: 1,
          display: "flex",
          justifyContent: collapsed ? "center" : "flex-end",
          flexShrink: 0,
        }}
      >
        <IconButton
          size="small"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          sx={{ color: theme.palette.text.secondary }}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </IconButton>
      </Box>
    </Box>
  );
}
