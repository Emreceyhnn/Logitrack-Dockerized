"use client";
import { Box, Container, Typography, Stack, Button } from "@mui/material";
import TimelineSection from "@/app/components/how-it-works/TimelineSection";
import type { Dictionary } from "@/app/lib/language/language";
import { getLocalizedPath } from "@/app/lib/language/navigation";

export default function HowItWorksClient({
  dict,
  lang,
}: {
  dict: Dictionary;
  lang: string;
}) {
  const hDict = dict?.landing?.howItWorksPage;
  const contactHref = `/${lang}${getLocalizedPath("/contact", lang)}?type=demo`;


  if (!hDict) {
    return <Box sx={{ p: 10, color: 'white', bgcolor: 'black' }}>Error: howItWorksPage dictionary is missing.</Box>;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#020617",
        color: "#f1f5f9",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "-10%",
          left: "-10%",
          width: "50%",
          height: "50%",
          background:
            "radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)",
          filter: "blur(120px)",
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "-10%",
          right: "-10%",
          width: "50%",
          height: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
          filter: "blur(120px)",
          zIndex: 0,
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Container maxWidth="md" sx={{ pt: 15, pb: 10, textAlign: "center" }}>
          <Typography
            variant="overline"
            sx={{
              color: "#38bdf8",
              fontWeight: 700,
              letterSpacing: 4,
              display: "block",
              mb: 2,
            }}
          >
            {hDict.hero.overline}
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              mb: 3,
              background: "linear-gradient(to right, #fff, #94a3b8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {hDict.hero.title}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "rgba(255, 255, 255, 0.6)",
              fontWeight: 400,
              mb: 6,
              maxWidth: 600,
              mx: "auto",
            }}
          >
            {hDict.hero.subtitle}
          </Typography>
        </Container>

        <Container maxWidth="lg">
          <TimelineSection />
        </Container>

        <Box sx={{ py: 15, textAlign: "center", position: "relative" }}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              height: "100%",
              background:
                "radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%)",
              zIndex: -1,
            }}
          />
          <Container maxWidth="sm">
            <Typography variant="h3" fontWeight={800} mb={3}>
              {hDict.cta.title}
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", mb: 5 }}>
              {hDict.cta.subtitle}
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              {/* MUI Button renders a native <a> when only `href` is given,
                  which stays serializable across the server/client boundary. */}
              <Button
                href={contactHref}
                variant="contained"
                sx={{
                  bgcolor: "#38bdf8",
                  color: "#000",
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  borderRadius: "12px",
                  "&:hover": { bgcolor: "#0ea5e9" },
                }}
              >
                {hDict.cta.freeDemo}
              </Button>
            </Stack>
          </Container>
        </Box>


      </Box>
    </Box>
  );
}
