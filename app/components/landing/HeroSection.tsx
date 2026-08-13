"use client";

import { useEffect, useState } from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import { getLocalizedPath } from "@/app/lib/language/navigation";
import { hasDashboardAccess } from "@/app/lib/actions/demoRequest";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import { motion } from "framer-motion";

export default function HeroSection() {
  const { lang, dict } = useLanguage();

  // CTA gating: only a signed-in user with dashboard access (active plan or a
  // live trial) sees the "Start" CTA into onboarding. Everyone else sees
  // "Sign In" + "Request a Demo". Resolved client-side so the hero itself stays
  // server-rendered for LCP/SEO.
  const [access, setAccess] = useState(false);

  useEffect(() => {
    let active = true;
    hasDashboardAccess()
      .then((ok) => {
        if (active) setAccess(ok);
      })
      .catch(() => {
        if (active) setAccess(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Hero's outlined button is an explicit "Request a Demo" CTA, so it tags the
  // resulting DB row as a demo request via ?type=demo.
  const contactHref = `/${lang}${getLocalizedPath("/contact", lang)}?type=demo`;
  const demoHref = `/${lang}${getLocalizedPath("/demo", lang)}`;
  const onboardingHref = `/${lang}${getLocalizedPath("/onboarding", lang)}`;

  return (
    <Box
      component="section"
      className="bg-hero-glow"
      sx={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2, md: 5 },
        py: 12,
        overflow: "hidden",
      }}
    >
      {/* Background Image */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.6,
        }}
      >
        <Image
          src="/bg-high-reso.webp"
          alt="LogiTrack Background"
          fill
          priority
          fetchPriority="high"
          quality={75}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        <Box
          className="bg-grid-pattern"
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.1,
            willChange: "transform", // Optimize for GPU
          }}
        />
      </Box>

      {/* Subdued Scanline Overlay */}
      <Box className="pointer-events-none fixed inset-0 z-[100] overflow-hidden opacity-[0.02] mix-blend-overlay">
        <Box className="h-[200vh] w-full animate-scanline bg-gradient-to-b from-transparent via-white to-transparent" />
      </Box>

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 10 }}>
        <Stack spacing={4} alignItems="center" textAlign="center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 0.75,
                borderRadius: "4px",
                bgcolor: "rgba(0, 242, 255, 0.05)",
                border: "1px solid rgba(0, 242, 255, 0.3)",
                backdropFilter: "blur(20px)",
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: "#00f2ff",
                  boxShadow: "0 0 10px #00f2ff",
                }}
              />
              <Typography
                className="font-label-md"
                sx={{
                  fontSize: "0.75rem",
                  color: "#00f2ff",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  fontWeight: 700,
                }}
              >
                {dict.landing.hero.badge}
              </Typography>
            </Box>
          </motion.div>

          {/* Title */}
          <Box
            sx={{
              animation: "fadeInUp 0.8s ease-out forwards",
              "@keyframes fadeInUp": {
                from: { opacity: 0.01, transform: "translateY(20px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: "2.5rem", md: "4rem" },
                fontWeight: 900,
                color: "white",
                lineHeight: 1.1,
                maxWidth: "900px",
                letterSpacing: "-0.04em",
              }}
            >
              {dict.landing.hero.titleMain}{" "}
              <Box
                component="span"
                className="text-glow"
                sx={{
                  color: "transparent",
                  background: "linear-gradient(90deg, #fff, #00f2ff, #7bd0ff)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                }}
              >
                {dict.landing.hero.titleHighlight}
              </Box>
            </Typography>
          </Box>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: "1rem", md: "1.125rem" },
                color: "rgba(255, 255, 255, 0.7)",
                maxWidth: "600px",
                lineHeight: 1.6,
              }}
            >
              {dict.landing.hero.description}
            </Typography>
          </motion.div>

          {/* Concrete benefits — grounds the abstract value prop in the three
              things the product actually does (fleet / shipment / warehouse). */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 1.5, sm: 3 }}
              alignItems="center"
              justifyContent="center"
            >
              {[
                {
                  icon: <LocalShippingOutlinedIcon sx={{ fontSize: 18 }} />,
                  label: dict.landing.hero.benefits.fleet,
                },
                {
                  icon: <RouteOutlinedIcon sx={{ fontSize: 18 }} />,
                  label: dict.landing.hero.benefits.shipment,
                },
                {
                  icon: <WarehouseOutlinedIcon sx={{ fontSize: 18 }} />,
                  label: dict.landing.hero.benefits.warehouse,
                },
              ].map((b) => (
                <Box
                  key={b.label}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    color: "rgba(255, 255, 255, 0.85)",
                  }}
                >
                  <Box sx={{ display: "inline-flex", color: "#00f2ff" }}>
                    {b.icon}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: { xs: "0.875rem", md: "0.9375rem" },
                      fontWeight: 600,
                    }}
                  >
                    {b.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </motion.div>

          {/* Persona — makes "who this is for" explicit within 30s. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
          >
            <Typography
              className="font-label-md"
              sx={{
                fontSize: "0.8125rem",
                color: "rgba(255, 255, 255, 0.55)",
                letterSpacing: "0.05em",
                textAlign: "center",
              }}
            >
              {dict.landing.hero.persona}
            </Typography>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              sx={{ mt: 2 }}
            >
              {access ? (
                <Button
                  variant="contained"
                  component={Link}
                  href={onboardingHref}
                  sx={{
                    bgcolor: "#00f2ff",
                    color: "#00363a",
                    px: 5,
                    py: 1.5,
                    fontWeight: 900,
                    fontSize: "0.875rem",
                    "&:hover": {
                      bgcolor: "white",
                      boxShadow: "0 0 40px rgba(0, 242, 255, 0.3)",
                    },
                  }}
                >
                  {dict.landing.hero.startTrial}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  component={Link}
                  href={demoHref}
                  startIcon={<BoltRoundedIcon />}
                  sx={{
                    bgcolor: "#00f2ff",
                    color: "#00363a",
                    px: 5,
                    py: 1.5,
                    fontWeight: 900,
                    fontSize: "0.875rem",
                    "&:hover": {
                      bgcolor: "white",
                      boxShadow: "0 0 40px rgba(0, 242, 255, 0.3)",
                    },
                  }}
                >
                  {dict.landing.hero.liveDemo}
                </Button>
              )}
              <Button
                variant="outlined"
                component={Link}
                href={contactHref}
                startIcon={<PlayCircleOutlineIcon />}
                sx={{
                  color: "white",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  bgcolor: "rgba(255, 255, 255, 0.04)",
                  px: 5,
                  py: 1.5,
                  fontWeight: 900,
                  fontSize: "0.875rem",
                  "&:hover": {
                    borderColor: "#00f2ff",
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                {dict.landing.hero.demo}
              </Button>
            </Stack>
          </motion.div>
        </Stack>
      </Container>
    </Box>
  );
}
