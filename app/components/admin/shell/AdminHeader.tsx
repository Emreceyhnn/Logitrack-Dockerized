"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Avatar,
  Box,
  Breadcrumbs,
  ButtonBase,
  Chip,
  Skeleton,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { ArrowLeft, Search, ShieldAlert } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  AdminHeaderProps,
  ServiceStatus,
} from "@/app/lib/type/admin/shell";

/**
 * tr-Servis listesinden en kötü durumu türetir.
 * en-Reduces per-service health to a single worst-case status for the header
 *    indicator. Ordering: down > degraded > unknown > up.
 * input (services: ServiceHealth[])
 * output (ServiceStatus)
 */
function worstStatus(
  services: { status: ServiceStatus }[]
): ServiceStatus {
  if (services.length === 0) return "unknown";
  if (services.some((s) => s.status === "down")) return "down";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  if (services.some((s) => s.status === "unknown")) return "unknown";
  return "up";
}

/**
 * tr-Yönetim konsolu üst çubuğu.
 * en-Admin console header: breadcrumbs, aggregate health, command trigger and
 *    the signed-in admin's identity.
 * input (AdminHeaderProps)
 * output (JSX.Element)
 */
export default function AdminHeader({
  adminName,
  adminEmail,
  avatarUrl,
  breadcrumbs,
  onOpenCommandPalette,
  services,
  servicesLoading,
}: AdminHeaderProps) {
  const theme = useTheme();
  const dict = useDictionary();

  const overall = useMemo(() => worstStatus(services), [services]);

  const overallLabel = servicesLoading
    ? dict.admin.header.checking
    : overall === "up"
      ? dict.admin.header.allSystems
      : overall === "down"
        ? dict.admin.header.outage
        : dict.admin.header.degraded;

  return (
    <Box
      component="header"
      sx={{
        height: 60,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: { xs: 2, md: 3 },
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(theme.palette.background.header, 0.8),
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: theme.zIndex.appBar,
      }}
    >
      {/* Breadcrumbs */}
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Breadcrumbs
          separator="/"
          aria-label="breadcrumb"
          sx={{
            fontSize: 13,
            "& .MuiBreadcrumbs-separator": {
              color: theme.palette.text.secondary,
              mx: 0.75,
            },
          }}
        >
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            if (crumb.href && !isLast) {
              return (
                <Typography
                  key={`${crumb.label}-${i}`}
                  component={Link}
                  href={crumb.href}
                  sx={{
                    fontSize: 13,
                    color: theme.palette.text.secondary,
                    textDecoration: "none",
                    "&:hover": { color: theme.palette.text.primary },
                  }}
                >
                  {crumb.label}
                </Typography>
              );
            }
            return (
              <Typography
                key={`${crumb.label}-${i}`}
                sx={{
                  fontSize: 13,
                  fontWeight: isLast ? 600 : 400,
                  color: isLast
                    ? theme.palette.text.primary
                    : theme.palette.text.secondary,
                }}
              >
                {crumb.label}
              </Typography>
            );
          })}
        </Breadcrumbs>
      </Box>

      {/* Command palette trigger */}
      <ButtonBase
        onClick={onOpenCommandPalette}
        aria-label={dict.admin.header.search}
        sx={{
          display: { xs: "none", sm: "flex" },
          alignItems: "center",
          gap: 1,
          height: 34,
          px: 1.5,
          borderRadius: 1.5,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.secondary,
          minWidth: 220,
          justifyContent: "flex-start",
          "&:hover": {
            borderColor: alpha(theme.palette.primary.main, 0.4),
            backgroundColor: theme.palette.background.hoverBg,
          },
        }}
      >
        <Search size={15} />
        <Typography sx={{ fontSize: 13, flexGrow: 1, textAlign: "left" }}>
          {dict.admin.header.search}
        </Typography>
        <Box
          component="kbd"
          sx={{
            fontSize: 10,
            fontWeight: 600,
            px: 0.75,
            py: 0.25,
            borderRadius: 0.75,
            border: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.secondary,
            fontFamily: "inherit",
          }}
        >
          {dict.admin.header.commandHint}
        </Box>
      </ButtonBase>

      {/* Aggregate service health */}
      <Tooltip title={overallLabel} arrow>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {servicesLoading ? (
            <Skeleton variant="circular" width={8} height={8} />
          ) : (
            <StatusBadge status={overall} dense />
          )}
          <Typography
            sx={{
              fontSize: 12,
              color: theme.palette.text.secondary,
              display: { xs: "none", lg: "block" },
            }}
          >
            {overallLabel}
          </Typography>
        </Box>
      </Tooltip>

      {/* Back to app */}
      <Tooltip title={dict.admin.header.backToApp} arrow>
        <ButtonBase
          component={Link}
          href="../overview"
          aria-label={dict.admin.header.backToApp}
          sx={{
            width: 34,
            height: 34,
            borderRadius: 1.5,
            color: theme.palette.text.secondary,
            "&:hover": {
              backgroundColor: theme.palette.background.hoverBg,
              color: theme.palette.text.primary,
            },
          }}
        >
          <ArrowLeft size={17} />
        </ButtonBase>
      </Tooltip>

      {/* Admin identity */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <Chip
          size="small"
          icon={<ShieldAlert size={12} />}
          label={dict.admin.badge}
          sx={{
            height: 24,
            fontSize: 10.5,
            fontWeight: 700,
            display: { xs: "none", md: "flex" },
            color: theme.palette.kpi.amber,
            backgroundColor: alpha(theme.palette.kpi.amber, 0.12),
            border: `1px solid ${alpha(theme.palette.kpi.amber, 0.25)}`,
            "& .MuiChip-icon": { color: theme.palette.kpi.amber, ml: 0.75 },
          }}
        />
        <Tooltip title={adminEmail ?? adminName} arrow>
          <Avatar
            src={avatarUrl ?? undefined}
            alt={adminName}
            sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 600 }}
          >
            {adminName.charAt(0).toUpperCase()}
          </Avatar>
        </Tooltip>
      </Box>
    </Box>
  );
}
