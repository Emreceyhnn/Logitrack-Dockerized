"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CircleRoundedIcon from "@mui/icons-material/CircleRounded";
import type { Dictionary } from "@/app/lib/language/language";

type ComplianceState = "live" | "inProgress" | "roadmap";

interface SecurityTrustSectionProps {
  dict: Dictionary;
  /** Localized href for the "request document" / "report issue" contact CTA. */
  contactHref: string;
  /** Stable, human date of the last manual status review (not "now"). */
  lastReviewed: string;
}

/**
 * Concrete trust signals for the Security Center: a compliance posture list
 * (honestly labelled live / in-progress / roadmap — no unearned badges), a
 * request-on-contact documents block, and a manually-reviewed status panel.
 *
 * Deliberately does NOT assert certifications the company doesn't hold or fake
 * a live uptime feed. When real certs, documents, or a status provider exist,
 * swap the dictionary copy / wire the hrefs to the real sources.
 */
export default function SecurityTrustSection({
  dict,
  contactHref,
  lastReviewed,
}: SecurityTrustSectionProps) {
  const theme = useTheme();
  const t = dict.landing.securityCenterPage.trust;

  const stateStyles: Record<
    ComplianceState,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    live: {
      label: t.compliance.statusLive,
      color: theme.palette.kpi.emerald,
      icon: <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />,
    },
    inProgress: {
      label: t.compliance.statusInProgress,
      color: "#fbbf24",
      icon: <HourglassTopRoundedIcon sx={{ fontSize: 18 }} />,
    },
    roadmap: {
      label: t.compliance.statusRoadmap,
      color: theme.palette.kpi.slateLight_alpha.main_60 ?? "#94a3b8",
      icon: <MapRoundedIcon sx={{ fontSize: 18 }} />,
    },
  };

  const complianceItems: {
    key: keyof typeof t.compliance.items;
    state: ComplianceState;
  }[] = [
    { key: "gdpr", state: "live" },
    { key: "encryption", state: "live" },
    { key: "accessControl", state: "live" },
    { key: "soc2", state: "inProgress" },
    { key: "iso27001", state: "roadmap" },
  ];

  const documentItems: (keyof typeof t.documents.items)[] = [
    "whitepaper",
    "dpa",
    "subprocessors",
  ];

  const panelBorder = `1px solid ${theme.palette.kpi.cyan_alpha.main_10}`;
  const panelBg = theme.palette.kpi.slateDark_alpha.main_40;

  return (
    <Stack spacing={10}>
      {/* ── Compliance posture ─────────────────────────────────────────── */}
      <Box>
        <SectionHeading
          overline={t.compliance.overline}
          title={t.compliance.title}
          subtitle={t.compliance.subtitle}
        />
        <Stack spacing={2}>
          {complianceItems.map(({ key, state }) => {
            const item = t.compliance.items[key];
            const s = stateStyles[state];
            return (
              <Stack
                key={key}
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background: panelBg,
                  border: panelBorder,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                    {item.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.kpi.slateLight_alpha.main_70,
                      lineHeight: 1.6,
                    }}
                  >
                    {item.description}
                  </Typography>
                </Box>
                <Chip
                  icon={
                    <Box
                      sx={{ display: "inline-flex", color: `${s.color} !important` }}
                    >
                      {s.icon}
                    </Box>
                  }
                  label={s.label}
                  sx={{
                    flexShrink: 0,
                    fontWeight: 700,
                    color: s.color,
                    bgcolor: `${s.color}1A`,
                    border: `1px solid ${s.color}55`,
                  }}
                />
              </Stack>
            );
          })}
        </Stack>
      </Box>

      {/* ── Documents ──────────────────────────────────────────────────── */}
      <Box>
        <SectionHeading
          overline={t.documents.overline}
          title={t.documents.title}
          subtitle={t.documents.subtitle}
        />
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          {documentItems.map((key) => {
            const doc = t.documents.items[key];
            return (
              <Box
                key={key}
                sx={{
                  flex: 1,
                  p: 4,
                  borderRadius: 4,
                  background: panelBg,
                  border: panelBorder,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <DescriptionRoundedIcon
                  sx={{ fontSize: 32, color: "#38bdf8", mb: 2 }}
                />
                <Typography fontWeight={700} sx={{ mb: 1 }}>
                  {doc.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.kpi.slateLight_alpha.main_70,
                    lineHeight: 1.6,
                    flex: 1,
                    mb: 3,
                  }}
                >
                  {doc.description}
                </Typography>
                <Button
                  component={Link}
                  href={contactHref}
                  variant="outlined"
                  sx={{
                    alignSelf: "flex-start",
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2,
                    borderColor: theme.palette.kpi.cyan_alpha.main_40,
                    color: "#38bdf8",
                    "&:hover": {
                      borderColor: "#38bdf8",
                      background: theme.palette.kpi.cyan_alpha.main_10,
                    },
                  }}
                >
                  {t.documents.requestCta}
                </Button>
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* ── System status ──────────────────────────────────────────────── */}
      <Box>
        <SectionHeading overline={t.status.overline} title={t.status.title} />
        <Box
          sx={{
            p: { xs: 4, md: 5 },
            borderRadius: 5,
            background: panelBg,
            border: `1px solid ${theme.palette.success._alpha.main_30}`,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircleRoundedIcon
                sx={{ fontSize: 14, color: theme.palette.kpi.emerald }}
              />
              <Typography variant="h6" fontWeight={700}>
                {t.status.operational}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{ color: theme.palette.kpi.slateLight_alpha.main_60 }}
            >
              {t.status.lastReviewed}: {lastReviewed}
            </Typography>
          </Stack>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.kpi.slateLight_alpha.main_60,
              mt: 2,
              lineHeight: 1.6,
            }}
          >
            {t.status.note}
          </Typography>
          <Button
            component={Link}
            href={contactHref}
            variant="text"
            sx={{
              mt: 2,
              px: 0,
              textTransform: "none",
              fontWeight: 700,
              color: "#38bdf8",
            }}
          >
            {t.status.cta}
          </Button>
        </Box>
      </Box>
    </Stack>
  );
}

function SectionHeading({
  overline,
  title,
  subtitle,
}: {
  overline: string;
  title: string;
  subtitle?: string;
}) {
  const theme = useTheme();
  return (
    <Box sx={{ mb: 5 }}>
      <Typography
        variant="overline"
        sx={{ color: "#38bdf8", letterSpacing: 3, fontWeight: 700 }}
      >
        {overline}
      </Typography>
      <Typography
        variant="h4"
        component="h2"
        sx={{ fontWeight: 800, mt: 1, mb: subtitle ? 2 : 0 }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          variant="body1"
          sx={{
            color: theme.palette.kpi.slateLight_alpha.main_80,
            maxWidth: 720,
            lineHeight: 1.7,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
