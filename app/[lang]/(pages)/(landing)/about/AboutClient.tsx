"use client";

import Image from "next/image";
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
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import { useDictionary } from "@/app/lib/language/DictionaryContext";


const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

export default function AboutClient() {
  const theme = useTheme();
  const dict = useDictionary();
  const aDict = dict.landing.aboutPage;

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

        <Stack spacing={4} alignItems="center" textAlign="center" mb={12}>
          <Chip
            label={aDict.mission.badge}
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
              background: "linear-gradient(120deg, #f8fafc 0%, #38bdf8 55%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              maxWidth: 800,
            }}
          >
            {aDict.mission.title}
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
            {aDict.mission.subtitle}
          </Typography>
        </Stack>

        <Divider sx={{ borderColor: theme.palette.kpi.slateLight_alpha.main_10, mb: 12 }} />


        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={8}
          alignItems="center"
          mb={16}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" sx={{ color: "#38bdf8", letterSpacing: 3, fontWeight: 700 }}>
              {aDict.vision.overline}
            </Typography>
            <Typography variant="h3" component="h2" sx={{ fontWeight: 800, mt: 2, mb: 4 }}>
              {aDict.vision.title}
            </Typography>
            <Typography variant="body1" sx={{ color: theme.palette.kpi.slateLight_alpha.main_90, fontSize: "1.1rem", lineHeight: 1.8 }}>
              {aDict.vision.description}
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              position: "relative",
              height: 400,
              width: "100%",
              borderRadius: 6,
              overflow: "hidden",
              border: `1px solid ${theme.palette.kpi.cyan_alpha.main_20}`,
              background: theme.palette.kpi.slateDark_alpha.main_40,
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: "80%",
                height: "60%",
                position: "relative",
                animation: `${float} 6s ease-in-out infinite`,
              }}
            >
              <Image
                src="/logo.svg"
                alt="LogiTrack Vision"
                fill
                style={{ objectFit: "contain", opacity: 0.8 }}
              />
            </Box>
          </Box>
        </Stack>


        <Box mb={16}>
          <Typography
            variant="h4"
            component="h2"
            textAlign="center"
            fontWeight={800}
            mb={8}
          >
            {aDict.pillars.title}
          </Typography>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={4}
          >
            {[
              {
                icon: <BoltRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
                title: aDict.pillars.items.resilience.title,
                description: aDict.pillars.items.resilience.description
              },
              {
                icon: <VisibilityRoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
                title: aDict.pillars.items.transparency.title,
                description: aDict.pillars.items.transparency.description
              },
              {
                icon: <SpeedRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
                title: aDict.pillars.items.efficiency.title,
                description: aDict.pillars.items.efficiency.description
              }
            ].map((pillar, idx) => (
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
                  }
                }}
              >
                <Box mb={3}>{pillar.icon}</Box>
                <Typography variant="h5" component="h3" fontWeight={700} mb={2}>
                  {pillar.title}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.kpi.slateLight_alpha.main_70, lineHeight: 1.7 }}>
                  {pillar.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>


        <Box
          sx={{
            p: { xs: 6, md: 10 },
            borderRadius: 8,
            background: "linear-gradient(135deg, #38bdf81a 0%, #6366f10d 100%)",
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
              background: "radial-gradient(circle, #38bdf826 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <Typography variant="h4" component="h2" fontWeight={800} mb={3}>
            {aDict.why.title}
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
            {aDict.why.subtitle}
          </Typography>
        </Box>
      </Container>


      <Box
        sx={{
          py: 8,
          borderTop: `1px solid ${theme.palette.kpi.slateLight_alpha.main_05}`,
          textAlign: "center",
          bgcolor: theme.palette.kpi.slateDeepest_alpha.main_50,
        }}
      >
        <Typography variant="body2" sx={{ color: theme.palette.kpi.slateLight_alpha.main_40 }}>
          {aDict.footer.copyright.replace("{year}", new Date().getFullYear().toString())}
        </Typography>
      </Box>
    </Box>
  );
}
