"use client";

import {
  Box,
  Container,
  Stack,
  Typography,
  Chip,
  Divider,
  useTheme,
} from "@mui/material";
import { keyframes } from "@mui/system";
import type { ReactNode } from "react";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

interface SectionCardData {
  icon: ReactNode;
  title: string;
  description: string;
}

interface DetailSectionData {
  overline: string;
  title: string;
  description: string;
}

interface StatItemData {
  value: string;
  label: string;
}

interface FooterPageLayoutProps {
  badge: string;
  title: string;
  subtitle: string;
  cards: SectionCardData[];
  detail?: DetailSectionData;
  stats?: StatItemData[];
  ctaTitle: string;
  ctaSubtitle: string;
  ctaIcon: ReactNode;
  /**
   * Optional page-specific content rendered after the detail section and before
   * the CTA. Lets a page (e.g. Security Center) inject concrete sections —
   * compliance badges, downloads, live status — without forking this shared
   * marketing template.
   */
  children?: ReactNode;
}

export default function FooterPageLayout({
  badge,
  title,
  subtitle,
  cards,
  detail,
  stats,
  ctaTitle,
  ctaSubtitle,
  ctaIcon,
  children,
}: FooterPageLayoutProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#0f172a",
        color: "#f1f5f9",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Gradients */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 20%, #3b82f626 0%, transparent 40%)," +
            "radial-gradient(circle at 80% 80%, #6366f11a 0%, transparent 50%)",
          zIndex: 0,
        }}
      />

      <Container
        maxWidth="lg"
        sx={{
          position: "relative",
          zIndex: 1,
          pt: { xs: 8, md: 12 },
          pb: { xs: 10, md: 16 },
        }}
      >
        {/* Hero Section */}
        <Stack
          spacing={4}
          alignItems="center"
          textAlign="center"
          mb={12}
          sx={{ animation: `${fadeIn} 0.8s ease-out` }}
        >
          <Chip
            label={badge}
            sx={{
              borderRadius: "999px",
              px: 2,
              py: 0.5,
              bgcolor: theme.palette.kpi.cyan_alpha.main_10,
              border: `1px solid ${theme.palette.kpi.cyan_alpha.main_30}`,
              color: "#38bdf8",
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              fontSize: "0.75rem",
            }}
          />
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 800,
              lineHeight: 1.1,
              background:
                "linear-gradient(120deg, #f8fafc 0%, #38bdf8 55%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              maxWidth: 800,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.kpi.slateLight_alpha.main_80,
              maxWidth: 700,
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            {subtitle}
          </Typography>
        </Stack>

        <Divider
          sx={{
            borderColor: theme.palette.kpi.slateLight_alpha.main_10,
            mb: 12,
          }}
        />

        {/* Stats Section (optional) */}
        {stats && stats.length > 0 && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={4}
            justifyContent="center"
            alignItems="center"
            mb={12}
            sx={{
              p: 5,
              borderRadius: 5,
              background: theme.palette.kpi.slateDark_alpha.main_40,
              border: `1px solid ${theme.palette.kpi.cyan_alpha.main_10}`,
            }}
          >
            {stats.map((stat, idx) => (
              <Stack
                key={idx}
                alignItems="center"
                spacing={1}
                sx={{
                  flex: 1,
                  borderRight:
                    idx < stats.length - 1
                      ? {
                          xs: "none",
                          sm: `1px solid ${theme.palette.kpi.slateLight_alpha.main_10}`,
                        }
                      : "none",
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    color: "#38bdf8",
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.kpi.slateLight_alpha.main_60,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    fontWeight: 600,
                    fontSize: "0.7rem",
                  }}
                >
                  {stat.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}

        {/* Feature Cards */}
        <Box mb={16}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
            {cards.map((card, idx) => (
              <Box
                key={idx}
                sx={{
                  flex: 1,
                  p: 5,
                  borderRadius: 5,
                  background: theme.palette.kpi.slateDark_alpha.main_40,
                  border: `1px solid ${theme.palette.kpi.cyan_alpha.main_10}`,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    borderColor: theme.palette.kpi.cyan_alpha.main_30,
                    background: theme.palette.kpi.slateDark_alpha.main_60,
                    boxShadow: `0 20px 40px ${theme.palette.common.black_alpha.main_40}`,
                  },
                }}
              >
                <Box mb={3}>{card.icon}</Box>
                <Typography
                  variant="h5"
                  component="h3"
                  fontWeight={700}
                  mb={2}
                >
                  {card.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.kpi.slateLight_alpha.main_70,
                    lineHeight: 1.7,
                  }}
                >
                  {card.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Detail Section (optional) */}
        {detail && (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={8}
            alignItems="center"
            mb={16}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="overline"
                sx={{ color: "#38bdf8", letterSpacing: 3, fontWeight: 700 }}
              >
                {detail.overline}
              </Typography>
              <Typography
                variant="h3"
                component="h2"
                sx={{ fontWeight: 800, mt: 2, mb: 4 }}
              >
                {detail.title}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: theme.palette.kpi.slateLight_alpha.main_90,
                  fontSize: "1.1rem",
                  lineHeight: 1.8,
                }}
              >
                {detail.description}
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                height: 300,
                width: "100%",
                borderRadius: 6,
                overflow: "hidden",
                border: `1px solid ${theme.palette.kpi.cyan_alpha.main_20}`,
                background: theme.palette.kpi.slateDark_alpha.main_40,
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(circle at center, #38bdf81a 0%, transparent 70%)",
                }}
              />
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #38bdf833, #a855f733)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${theme.palette.kpi.cyan_alpha.main_30}`,
                }}
              >
                {ctaIcon}
              </Box>
            </Box>
          </Stack>
        )}

        {/* Page-specific content slot (e.g. compliance/downloads/status) */}
        {children && <Box mb={16}>{children}</Box>}

        {/* CTA Section */}
        <Box
          sx={{
            p: { xs: 6, md: 10 },
            borderRadius: 8,
            background:
              "linear-gradient(135deg, #38bdf81a 0%, #6366f10d 100%)",
            border: `1px solid ${theme.palette.kpi.cyan_alpha.main_20}`,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              background:
                "radial-gradient(circle, #38bdf826 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <Typography
            variant="h4"
            component="h2"
            fontWeight={800}
            mb={3}
          >
            {ctaTitle}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: theme.palette.kpi.slateLight_alpha.main_90,
              maxWidth: 800,
              mx: "auto",
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            {ctaSubtitle}
          </Typography>
        </Box>
      </Container>


    </Box>
  );
}
