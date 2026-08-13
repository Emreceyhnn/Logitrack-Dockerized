"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Stack,
  Typography,
  Chip,
  Grid,
  Button,
  Switch,
  Divider,
  useTheme,
} from "@mui/material";
import { keyframes } from "@mui/system";
import Link from "next/link";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { getLocalizedPath } from "@/app/lib/language/navigation";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 20px #38bdf833; }
  50% { box-shadow: 0 0 40px #38bdf866; }
  100% { box-shadow: 0 0 20px #38bdf833; }
`;

export default function PricingClient({
  lang = "tr",
  showAccessNotice = false,
}: {
  lang?: string;
  showAccessNotice?: boolean;
}) {
  const theme = useTheme();
  const [isYearly, setIsYearly] = useState(false);
  const dict = useDictionary();
  const contactHref = `/${lang}${getLocalizedPath("/contact", lang)}?type=demo`;
  // Self-serve tiers send the user straight into sign-up (which grants a 7-day
  // trial on registration); the chosen plan rides along as ?plan= for later
  // pre-selection. Only Enterprise, which has no listed price, keeps the
  // "contact sales" wall.
  const signUpHref = (plan: string) =>
    `/${lang}${getLocalizedPath("/auth/sign-up", lang)}?plan=${plan}`;

  const pricingTiers = [
    {
      title: dict.landing.pricing.tiers.starter.title,
      priceMonthly: 49,
      priceYearly: 39,
      description: dict.landing.pricing.tiers.starter.description,
      features: dict.landing.pricing.tiers.starter.features,
      buttonText: dict.landing.pricing.tiers.starter.cta,
      href: signUpHref("starter"),
      highlight: false,
    },
    {
      title: dict.landing.pricing.tiers.pro.title,
      priceMonthly: 199,
      priceYearly: 159,
      description: dict.landing.pricing.tiers.pro.description,
      features: dict.landing.pricing.tiers.pro.features,
      buttonText: dict.landing.pricing.tiers.pro.cta,
      href: signUpHref("pro"),
      highlight: true,
    },
    {
      title: dict.landing.pricing.tiers.enterprise.title,
      priceMonthly: null,
      priceYearly: null,
      description: dict.landing.pricing.tiers.enterprise.description,
      features: dict.landing.pricing.tiers.enterprise.features,
      buttonText: dict.landing.pricing.tiers.enterprise.cta,
      href: contactHref,
      highlight: false,
    }
  ];

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
      <Box
        sx={{
          position: "absolute",
          top: "-5%",
          right: "-5%",
          width: "50vw",
          height: "50vw",
          background: "radial-gradient(circle, #38bdf814 0%, transparent 70%)",
          filter: "blur(100px)",
          zIndex: 0,
        }}
      />

      <Container
        maxWidth="lg"
        sx={{
          position: "relative",
          zIndex: 1,
          pt: { xs: 10, md: 15 },
          pb: { xs: 12, md: 20 },
        }}
      >
        {showAccessNotice && (
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{
              mb: 5,
              p: 2,
              borderRadius: 3,
              bgcolor: "rgba(251, 191, 36, 0.08)",
              border: "1px solid rgba(251, 191, 36, 0.35)",
              animation: `${fadeIn} 0.5s ease-out`,
            }}
          >
            <InfoOutlinedIcon sx={{ color: "#fbbf24" }} />
            <Typography variant="body2" sx={{ color: "#fde68a", fontWeight: 600 }}>
              {dict.landing.pricing.accessNotice}
            </Typography>
          </Stack>
        )}

        <Stack spacing={4} alignItems="center" textAlign="center" mb={10} sx={{ animation: `${fadeIn} 0.8s ease-out` }}>
          <Chip
            label={dict.landing.pricing.badge}
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
            }}
          />
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 900,
              fontSize: { xs: "2.5rem", md: "4rem" },
              lineHeight: 1.1,
              background: "linear-gradient(120deg, #f8fafc 0%, #38bdf8 55%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
            dangerouslySetInnerHTML={{ __html: dict.landing.pricing.title }}
          />

          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" sx={{ color: !isYearly ? "#38bdf8" : theme.palette.kpi.slateLight_alpha.main_60, fontWeight: 600 }}>
              {dict.landing.pricing.monthly}
            </Typography>
            <Switch
              checked={isYearly}
              onChange={() => setIsYearly(!isYearly)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#38bdf8' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#38bdf8' },
              }}
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ color: isYearly ? "#38bdf8" : theme.palette.kpi.slateLight_alpha.main_60, fontWeight: 600 }}>
                {dict.landing.pricing.yearly}
              </Typography>
              <Chip
                label={dict.landing.pricing.save}
                size="small"
                sx={{
                  bgcolor: theme.palette.success._alpha.main_10,
                  color: theme.palette.kpi.emerald,
                  border: `1px solid ${theme.palette.success._alpha.main_30}`,
                  fontSize: "0.65rem",
                  fontWeight: 800
                }}
              />
            </Stack>
          </Stack>
        </Stack>

        <Grid container spacing={4} alignItems="center">
          {pricingTiers.map((tier, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={idx}>
              <Box
                sx={{
                  p: 5,
                  borderRadius: 8,
                  bgcolor: tier.highlight ? theme.palette.kpi.slateDark_alpha.main_60 : theme.palette.kpi.slateDark_alpha.main_40,
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${tier.highlight ? theme.palette.kpi.cyan_alpha.main_40 : theme.palette.kpi.slateLight_alpha.main_10}`,
                  position: "relative",
                  transition: "all 0.3s ease",
                  animation: tier.highlight ? `${glow} 3s infinite ease-in-out` : "none",
                  "&:hover": {
                    transform: "translateY(-10px)",
                    borderColor: theme.palette.kpi.cyan_alpha.main_60,
                    bgcolor: theme.palette.kpi.slateDark_alpha.main_70,
                  }
                }}
              >
                {tier.highlight && (
                  <Chip
                    label={dict.landing.pricing.mostPopular}
                    sx={{
                      position: "absolute",
                      top: -16,
                      left: "50%",
                      transform: "translateX(-50%)",
                      bgcolor: "linear-gradient(135deg, #38bdf8, #6366f1)",
                      color: "#fff",
                      fontWeight: 800,
                      px: 1,
                    }}
                  />
                )}

                <Typography variant="h5" component="h2" fontWeight={800} mb={1}>
                  {tier.title}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.kpi.slateLight_alpha.main_60, mb: 4, height: 40 }}>
                  {tier.description}
                </Typography>

                <Stack direction="row" alignItems="flex-end" spacing={1} mb={4}>
                  <Typography variant="h3" fontWeight={900}>
                    {tier.priceMonthly === null ? dict.landing.pricing.custom : `$${isYearly ? tier.priceYearly : tier.priceMonthly}`}
                  </Typography>
                  {tier.priceMonthly !== null && (
                    <Typography variant="body2" sx={{ color: theme.palette.kpi.slateLight_alpha.main_40, mb: 1 }}>
                      {dict.landing.pricing.perMonth}
                    </Typography>
                  )}
                </Stack>

                <Divider sx={{ borderColor: theme.palette.kpi.slateLight_alpha.main_05, mb: 4 }} />

                <Stack spacing={2} mb={5}>
                  {tier.features.map((feature, fIdx) => (
                    <Stack direction="row" spacing={1.5} alignItems="center" key={fIdx}>
                      <CheckCircleRoundedIcon sx={{ fontSize: 18, color: "#38bdf8", opacity: 0.8 }} />
                      <Typography variant="body2" sx={{ color: theme.palette.kpi.slateLight_alpha.main_80 }}>
                        {feature}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                <Button
                  fullWidth
                  component={Link}
                  href={tier.href}
                  variant={tier.highlight ? "contained" : "outlined"}
                  sx={{
                    py: 1.5,
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "1rem",
                    background: tier.highlight ? "linear-gradient(135deg, #38bdf8, #6366f1)" : "transparent",
                    borderColor: theme.palette.kpi.cyan_alpha.main_40,
                    "&:hover": {
                      background: tier.highlight ? "linear-gradient(135deg, #0ea5e9, #4f46e5)" : theme.palette.kpi.cyan_alpha.main_10,
                    }
                  }}
                >
                  {tier.buttonText}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>


      </Container>


    </Box>
  );
}
