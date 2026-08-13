"use client";

import { Box, Container, Grid, Typography } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import InsightsIcon from "@mui/icons-material/Insights";
import RouteIcon from "@mui/icons-material/Route";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { motion } from "framer-motion";

export default function FeaturesSection() {
  const dict = useDictionary();

  const features = [
    {
      title: dict.landing.features.smartRoute.title,
      desc: dict.landing.features.smartRoute.desc,
      icon: <InsightsIcon sx={{ fontSize: 32 }} />,
      color: "#00f2ff",
      delay: 0,
    },
    {
      title: dict.landing.features.predictiveEta.title,
      desc: dict.landing.features.predictiveEta.desc,
      icon: <RouteIcon sx={{ fontSize: 32 }} />,
      color: "#7bd0ff",
      delay: 0.2,
      translateY: { md: 32 },
    },
    {
      title: dict.landing.features.driverPerf.title,
      desc: dict.landing.features.driverPerf.desc,
      icon: <LocalShippingIcon sx={{ fontSize: 32 }} />,
      color: "#00dbe7",
      delay: 0.4,
      translateY: { md: 64 },
    },
  ];

  return (
    <Box component="section" sx={{ py: 20, bgcolor: "#10141a" }} id="solutions">
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 12 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Typography
              className="font-label-md"
              sx={{
                fontSize: "0.75rem",
                color: "#00f2ff",
                textTransform: "uppercase",
                letterSpacing: "0.4em",
                mb: 3,
                fontWeight: 900,
              }}
            >
              {dict.landing.features.overline}
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: "2rem", md: "2.5rem" },
                fontWeight: 800,
                color: "white",
                mb: 3,
              }}
            >
              {dict.landing.features.title}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                maxWidth: "700px",
                mx: "auto",
                fontSize: "1.125rem",
                lineHeight: 1.6,
              }}
            >
              {dict.landing.features.description}
            </Typography>
          </motion.div>
        </Box>

        <Grid container spacing={5}>
          {features.map((feature, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={idx}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: feature.delay }}
                viewport={{ once: true }}
                style={{ height: "100%" }}
              >
                <Box
                  className="glass-inner"
                  sx={{
                    p: 5,
                    borderRadius: "4px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    height: "100%",
                    minHeight: { xs: "auto", md: 360 },
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    transition: "all 0.3s ease",
                    transform: feature.translateY 
                      ? { xs: "none", md: `translateY(${feature.translateY.md}px)` }
                      : "none",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.08)",
                      borderColor: `${feature.color}66`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: "4px",
                      bgcolor: `${feature.color}1a`,
                      border: `1px solid ${feature.color}4d`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: feature.color,
                      transition: "all 0.3s ease",
                      ".MuiSvgIcon-root": {
                        transition: "all 0.3s ease",
                      },
                      "&:hover": {
                        bgcolor: feature.color,
                        color: "#10141a",
                      },
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ color: "white", fontWeight: 800, mb: 2 }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "rgba(255, 255, 255, 0.7)",
                        lineHeight: 1.6,
                        fontSize: "0.875rem",
                      }}
                    >
                      {feature.desc}
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
