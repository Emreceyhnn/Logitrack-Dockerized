"use client";

import { Box, Card, Skeleton, Stack, useTheme } from "@mui/material";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import StatCard from "../cards/StatCard";
import { useLanguage } from "@/app/lib/language/DictionaryContext";

interface KpiItem {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; isUp: boolean } | undefined;
  /** Drill-down target — makes the tile a link to a filtered list/detail. */
  href?: string;
}

interface KpiCardsProps {
  kpis: KpiItem[];
  loading: boolean;
}

export default function KpiCards({ kpis, loading }: KpiCardsProps) {
  const theme = useTheme();
  const router = useRouter();
  const { lang } = useLanguage();
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <Box
      component={motion.div}
      variants={container}
      // initial={false}: with initial="hidden" the server-rendered HTML ships
      // at opacity 0 and the cards stay invisible until framer-motion
      // hydrates — a blank KPI zone on first paint.
      initial={false}
      animate="show"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "stretch",
        gap: 3,
        mt: 3,
        width: "100%",
        "& > *": {
          flex: {
            xs: "1 1 100%",
            sm: "1 1 calc(50% - 24px)",
            md: "1 1 calc(25% - 24px)",
          },
          display: "flex",
        },
      }}
    >
      {kpis.map((kpi, index) => (
        <Box
          key={index}
          sx={{
            width: {
              xs: "100%",
              sm: "calc(50% - 8px)",
              md: index < 4 ? "calc(25% - 12px)" : "calc(50% - 8px)",
            },
          }}
        >
          {!loading ? (
            <StatCard
              title={kpi.label}
              value={kpi.value.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}
              icon={kpi.icon}
              color={kpi.color}
              trend={kpi.trend}
              onClick={kpi.href ? () => router.push(kpi.href as string) : undefined}
              sx={{ height: "100%" }}
            />
          ) : (
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
          )}
        </Box>
      ))}
    </Box>
  );
}
