"use client";

import {
  Box,
  Container,
  Stack,
  Typography,
  Chip,
  Grid,
  
  useTheme,
} from "@mui/material";
import { keyframes } from "@mui/system";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

export default function FeaturesClient() {
  const theme = useTheme();
  const dict = useDictionary();
  const fDict = dict.landing.featuresPage;

  const features = [
    {
      icon: <MapRoundedIcon sx={{ fontSize: 40, color: "#38bdf8" }} />,
      title: fDict.items.routeOptimization.title,
      description: fDict.items.routeOptimization.description,
      tag: fDict.items.routeOptimization.tag,
      details: fDict.items.routeOptimization.details
    },
    {
      icon: <Inventory2RoundedIcon sx={{ fontSize: 40, color: "#a855f7" }} />,
      title: fDict.items.warehouse.title,
      description: fDict.items.warehouse.description,
      tag: fDict.items.warehouse.tag,
      details: fDict.items.warehouse.details
    },
    {
      icon: <AnalyticsRoundedIcon sx={{ fontSize: 40, color: "#22d3ee" }} />,
      title: fDict.items.telemetry.title,
      description: fDict.items.telemetry.description,
      tag: fDict.items.telemetry.tag,
      details: fDict.items.telemetry.details
    },
    {
      icon: <NotificationsActiveRoundedIcon sx={{ fontSize: 40, color: "#f472b6" }} />,
      title: fDict.items.alerts.title,
      description: fDict.items.alerts.description,
      tag: fDict.items.alerts.tag,
      details: fDict.items.alerts.details
    },
    {
      icon: <SecurityRoundedIcon sx={{ fontSize: 40, color: "#10b981" }} />,
      title: fDict.items.compliance.title,
      description: fDict.items.compliance.description,
      tag: fDict.items.compliance.tag,
      details: fDict.items.compliance.details
    },
    {
      icon: <BoltRoundedIcon sx={{ fontSize: 40, color: "#fbbf24" }} />,
      title: fDict.items.api.title,
      description: fDict.items.api.description,
      tag: fDict.items.api.tag,
      details: fDict.items.api.details
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
          top: "10%",
          left: "5%",
          width: "40vw",
          height: "40vw",
          background: "radial-gradient(circle, #38bdf81a 0%, transparent 70%)",
          filter: "blur(80px)",
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "10%",
          right: "5%",
          width: "30vw",
          height: "30vw",
          background: "radial-gradient(circle, #a855f71a 0%, transparent 70%)",
          filter: "blur(80px)",
          zIndex: 0,
        }}
      />


      <Container
        maxWidth="lg"
        sx={{
          position: "relative",
          zIndex: 1,
          pt: { xs: 8, md: 15 },
          pb: { xs: 10, md: 20 },
        }}
      >

        <Stack spacing={4} alignItems="center" textAlign="center" mb={15} sx={{ animation: `${fadeIn} 0.8s ease-out` }}>
          <Chip
            label={fDict.badge}
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
            variant="h1"
            sx={{
              fontWeight: 900,
              fontSize: { xs: "2.5rem", md: "4.5rem" },
              lineHeight: 1,
              background: "linear-gradient(120deg, #f8fafc 0%, #38bdf8 55%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
            dangerouslySetInnerHTML={{ __html: fDict.heroTitle }}
          />
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.kpi.slateLight_alpha.main_70,
              maxWidth: 800,
              fontWeight: 300,
              lineHeight: 1.6,
            }}
          >
            {fDict.heroSubtitle}
          </Typography>
        </Stack>

        <Grid container spacing={4}>
          {features.map((feature, idx) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={idx}>
              <Box
                sx={{
                  height: "100%",
                  p: 5,
                  borderRadius: 6,
                  background: "#1e293b66",
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${theme.palette.kpi.cyan_alpha.main_15}`,
                  transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  animation: `${fadeIn} 0.6s ease-out backwards`,
                  animationDelay: `${idx * 0.1}s`,
                  "&:hover": {
                    transform: "translateY(-12px) scale(1.02)",
                    borderColor: theme.palette.kpi.cyan_alpha.main_40,
                    background: "#1e293b99",
                    boxShadow: `0 40px 80px -20px ${theme.palette.common.black_alpha.main_50}`,
                    "& .feature-icon": {
                      animation: `${float} 2s ease-in-out infinite`,
                    }
                  }
                }}
              >
                <Stack spacing={3}>
                  <Box className="feature-icon" sx={{ transition: "transform 0.3s ease" }}>
                    {feature.icon}
                  </Box>
                  <Box>
                    <Chip
                      label={feature.tag}
                      size="small"
                      sx={{
                        bgcolor: theme.palette.kpi.cyan_alpha.main_05,
                        color: theme.palette.kpi.cyan_alpha.main_80,
                        border: `1px solid ${theme.palette.kpi.cyan_alpha.main_20}`,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        mb: 2
                      }}
                    />
                    <Typography variant="h5" component="h3" fontWeight={800} mb={2}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.kpi.slateLight_alpha.main_60, lineHeight: 1.8 }}>
                      {feature.description}
                    </Typography>
                  </Box>

                  <Box sx={{ pt: 2, borderTop: `1px solid ${theme.palette.kpi.slateLight_alpha.main_05}` }}>
                    <Stack spacing={1}>
                      {feature.details.map((detail, dIdx) => (
                        <Stack direction="row" spacing={1.5} alignItems="center" key={dIdx}>
                          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#38bdf8" }} />
                          <Typography variant="caption" sx={{ color: theme.palette.kpi.slateLight_alpha.main_80, fontWeight: 500 }}>
                            {detail}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>


        <Box
          sx={{
            mt: 20,
            p: 8,
            borderRadius: 8,
            border: `1px solid ${theme.palette.kpi.cyan_alpha.main_20}`,
            background: "linear-gradient(180deg, #1e293b33 0%, #1e293b00 100%)",
            textAlign: "center",
          }}
        >
          <Typography variant="overline" sx={{ color: "#38bdf8", letterSpacing: 4, fontWeight: 800 }}>
            {fDict.infrastructure.overline}
          </Typography>
          <Typography variant="h3" component="h2" sx={{ fontWeight: 900, mt: 3, mb: 4 }}>
            {fDict.infrastructure.title}
          </Typography>
          <Typography variant="body1" sx={{ color: theme.palette.kpi.slateLight_alpha.main_70, maxWidth: 900, mx: "auto", mb: 6, lineHeight: 1.8 }}>
            {fDict.infrastructure.description}
          </Typography>

          <Grid container spacing={2} justifyContent="center">
            {fDict.infrastructure.stats.map((stat, sIdx) => (
              <Grid key={sIdx}>
                <Box
                  sx={{
                    px: 3,
                    py: 1.5,
                    borderRadius: 999,
                    border: `1px solid ${theme.palette.kpi.slateLight_alpha.main_10}`,
                    bgcolor: theme.palette.kpi.slateDeep_alpha.main_40,
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>
                    {stat}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>



    </Box>
  );
}
