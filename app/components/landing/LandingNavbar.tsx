"use client";

import {
  AppBar,
  Box,
  Container,
  Stack,
  Toolbar,
  Typography,
  useScrollTrigger,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import LandingHeaderAuth from "./LandingHeaderAuth";
import LanguageSwitcher from "../nav/LanguageSwitcher";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import { getLocalizedPath } from "@/app/lib/language/navigation";

export default function LandingNavbar() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const { lang, dict } = useLanguage();
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 50,
  });

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background: "transparent",
        top: trigger ? 0 : 0,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        border: "none",
        boxShadow: "none",
        zIndex: 1100,
      }}
    >
      <Container
        sx={{
          maxWidth: "100vw !important",
          background: trigger ? "rgba(10, 14, 20, 0.8)" : "transparent",
          backdropFilter: trigger ? "blur(20px)" : "none",
          borderBottom: trigger
            ? "1px solid rgba(0, 242, 255, 0.1)"
            : "1px solid rgba(255, 255, 255, 0.05)",
          transition: "all 0.4s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            py: trigger ? 1 : 2,
            px: { xs: 2, md: 6 },
            width: "100%",
            maxWidth: "lg",
            justifyContent: "space-between",
          }}
        >
          <Link href={`/${lang}`} style={{ textDecoration: "none" }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: trigger ? 32 : 36,
                  height: trigger ? 32 : 36,
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #00f2ff, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.4s ease",
                  boxShadow: trigger
                    ? "none"
                    : "0 0 20px rgba(0, 242, 255, 0.2)",
                }}
              >
                <Image
                  src="/logo-white.svg"
                  alt="LogiTrack Logo"
                  width={trigger ? 18 : 20}
                  height={trigger ? 18 : 20}
                />
              </Box>
              <Typography
                sx={{
                  color: "white",
                  fontWeight: 900,
                  fontSize: trigger ? "1.125rem" : "1.25rem",
                  letterSpacing: "-0.02em",
                  transition: "all 0.4s ease",
                }}
              >
                LogiTrack
              </Typography>
            </Stack>
          </Link>

          <Stack
            component="nav"
            direction="row"
            spacing={{ md: 3, lg: 5 }}
            alignItems="center"
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            {[
              {
                label: dict.navbar.features,
                href: `/${lang}${getLocalizedPath("/features", lang)}`,
              },
              {
                label: dict.navbar.pricing,
                href: `/${lang}${getLocalizedPath("/pricing", lang)}`,
              },
              {
                label: dict.navbar.about,
                href: `/${lang}${getLocalizedPath("/about", lang)}`,
              },
              {
                label: dict.navbar.howItWorks,
                href: `/${lang}${getLocalizedPath("/how-it-works", lang)}`,
              },
              {
                label: dict.navbar.contact,
                href: `/${lang}${getLocalizedPath("/contact", lang)}`,
              },
            ].map((item) => (
              <Typography
                key={item.label}
                component={Link}
                href={item.href}
                variant="body2"
                sx={{
                  fontWeight: 700,
                  textDecoration: "none",
                  color: "rgba(255, 255, 255, 0.6)",
                  transition: "all 0.2s ease",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  "&:hover": { color: "#00f2ff" },
                }}
              >
                {item.label}
              </Typography>
            ))}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <LanguageSwitcher />
            <LandingHeaderAuth />
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
