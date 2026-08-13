"use client";

import { Box, Skeleton, useTheme } from "@mui/material";
import {
  Building2,
  KeyRound,
  LogIn,
  Package,
  ShieldAlert,
  Users,
} from "lucide-react";
import StatCard from "@/app/components/cards/StatCard";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  AdminKpiGridProps,
  AdminKpiKey,
} from "@/app/lib/type/admin/overview";

const ICONS: Record<AdminKpiKey, typeof Users> = {
  tenants: Building2,
  users: Users,
  activeSessions: KeyRound,
  signIns: LogIn,
  shipments: Package,
  failedSignIns: ShieldAlert,
};

/**
 * tr-KPI kartları ızgarası.
 * en-KPI band for the overview dashboard. Reuses the dashboard's `StatCard` so
 *    the console inherits the app's existing card treatment rather than
 *    introducing a second visual language.
 * input (AdminKpiGridProps)
 * output (JSX.Element)
 */
export default function AdminKpiGrid({ kpis, loading }: AdminKpiGridProps) {
  const theme = useTheme();
  const dict = useDictionary();

  const colors: Record<AdminKpiKey, string> = {
    tenants: theme.palette.kpi.indigo,
    users: theme.palette.kpi.sky,
    activeSessions: theme.palette.kpi.emerald,
    signIns: theme.palette.kpi.violet,
    shipments: theme.palette.kpi.cyan,
    // Failed sign-ins are a security signal, so they always read as a warning
    // colour even at zero.
    failedSignIns: theme.palette.kpi.amber,
  };

  if (loading && kpis.length === 0) {
    return (
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
            xl: "repeat(6, 1fr)",
          },
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={160}
            sx={{ borderRadius: "28px" }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          lg: "repeat(3, 1fr)",
          xl: "repeat(6, 1fr)",
        },
      }}
    >
      {kpis.map((item) => {
        const Icon = ICONS[item.key];
        return (
          <StatCard
            key={item.key}
            title={dict.admin.overview.kpi[item.key]}
            value={item.value.toLocaleString()}
            color={colors[item.key]}
            icon={<Icon size={24} />}
            trend={item.trend}
          />
        );
      })}
    </Box>
  );
}
