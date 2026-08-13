"use client";

import { Box, Stack, Typography, useTheme, Grid, Button } from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const { dict, lang } = useLanguage();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const content = (
    <Box
      sx={{
        width: "100%",
        height: "100dvh",
        display: "flex",
        bgcolor: "background.default",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
      }}
    >
      {/* Every auth page (sign-in, sign-up, forgot-password, ...) shares this
          layout, so one back-to-home affordance here covers all of them. */}
      <Button
        component={Link}
        href={`/${lang}?landing=true`}
        startIcon={<HomeRoundedIcon sx={{ fontSize: 18 }} />}
        sx={{
          position: "fixed",
          top: { xs: 12, sm: 20 },
          left: { xs: 12, sm: 20 },
          zIndex: 1100,
          textTransform: "none",
          fontWeight: 700,
          fontSize: "0.8rem",
          borderRadius: "999px",
          px: 1.75,
          py: 0.5,
          color: "rgba(255, 255, 255, 0.85)",
          bgcolor: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(8px)",
          "&:hover": {
            bgcolor: "rgba(255, 255, 255, 0.12)",
            borderColor: "rgba(255, 255, 255, 0.2)",
          },
        }}
      >
        {dict.common.backToHome || "Back to Home"}
      </Button>

      <Grid container sx={{ height: "100dvh", overflow: "hidden", m: 0, width: "100%" }}>
        {/* Left Side: Feature Visual (Desktop Only) */}
        <Grid
          size={{ xs: 0, md: 6, lg: 7 }}
          sx={{
            display: { xs: "none", md: "block" },
            position: "relative",
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            overflow: "hidden",
          }}
        >
          {/* Background Decorative Blur */}
          <Box
            sx={{
              position: "absolute",
              top: "-20%",
              right: "-20%",
              width: "60%",
              height: "60%",
              background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)",
              filter: "blur(80px)",
              zIndex: 1,
            }}
          />

          <Stack
            spacing={4}
            sx={{
              height: "100%",
              position: "relative",
              zIndex: 2,
              p: 6,
              justifyContent: "center",
              alignItems: "flex-start",
              color: "white",
            }}
          >
            {/* Branding */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "12px",
                  bgcolor: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                }}
              >
                <Image
                  src="/logo-white.svg"
                  alt="LogiTrack"
                  width={32}
                  height={32}
                  style={{ filter: "invert(1) brightness(0.2)" }}
                />
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                }}
              >
                {dict.common.logitrack}
              </Typography>
            </Stack>

            <Stack spacing={2}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.1,
                  maxWidth: "500px",
                  letterSpacing: "-0.04em",
                }}
              >
                {dict.common.logitrack} v2
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 400,
                  opacity: 0.9,
                  maxWidth: "450px",
                  lineHeight: 1.6,
                }}
              >
                {dict.auth?.tagline ||
                  "Empowering global supply chains with real-time intelligence and seamless coordination."}
              </Typography>
            </Stack>

            {/* Feature Image */}
            <Box
              sx={{
                width: "120%",
                mt: 4,
                ml: 4,
                borderRadius: "32px 0 0 32px",
                overflow: "hidden",
                boxShadow: "-24px 24px 64px rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.1)",
                position: "relative",
                transform: "perspective(1000px) rotateY(-10deg)",
              }}
            >
              <Image
                src="/auth-visual.png"
                alt="Logistics Network"
                width={1200}
                height={800}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
              />
            </Box>
          </Stack>
        </Grid>

        {/* Right Side: Auth Form */}
        <Grid
          size={{ xs: 12, md: 6, lg: 5 }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            bgcolor: "background.default",
            overflowY: "auto",
            maxHeight: "100dvh",
          }}
        >
          {/* Subtle background glow for dark mode */}
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "80%",
              height: "80%",
              background: `radial-gradient(circle, ${theme.palette.primary.main}10 0%, transparent 70%)`,
              filter: "blur(120px)",
              zIndex: 0,
            }}
          />
          
          <Box
            sx={{
              width: "100%",
              maxWidth: "480px",
              p: { xs: 3, sm: 6 },
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Mobile Branding (only visible on mobile) */}
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ display: { xs: "flex", md: "none" }, mb: 4, justifyContent: "center" }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #38bdf8, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  src="/logo-white.svg"
                  alt="LogiTrack"
                  width={20}
                  height={20}
                />
              </Box>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 20,
                  textTransform: "uppercase",
                  color: "text.primary",
                }}
              >
                {dict.common.logitrack}
              </Typography>
            </Stack>

            {children}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID} locale={lang}>
      {content}
    </GoogleOAuthProvider>
  );
}
