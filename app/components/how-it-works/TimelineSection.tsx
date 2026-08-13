"use client";

import { Box, Stack, Typography, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

export default function TimelineSection() {
  const theme = useTheme();
  const dict = useDictionary();

  const steps = [
    {
      step: "01",
      title: dict.landing.workflow.title1,
      description: dict.landing.workflow.desc1,
      color: theme.palette.kpi.cyan,
      alpha: theme.palette.kpi.cyan_alpha,
    },
    {
      step: "02",
      title: dict.landing.workflow.title2,
      description: dict.landing.workflow.desc2,
      color: theme.palette.kpi.indigo,
      alpha: theme.palette.kpi.indigo_alpha,
    },
    {
      step: "03",
      title: dict.landing.workflow.title3,
      description: dict.landing.workflow.desc3,
      color: theme.palette.kpi.purple,
      alpha: theme.palette.kpi.purple_alpha,
    },
    {
      step: "04",
      title: dict.landing.workflow.title4,
      description: dict.landing.workflow.desc4,
      color: theme.palette.kpi.cyan,
      alpha: theme.palette.kpi.cyan_alpha,
    },
    {
      step: "05",
      title: dict.landing.workflow.title5,
      description: dict.landing.workflow.desc5,
      color: theme.palette.kpi.indigo,
      alpha: theme.palette.kpi.indigo_alpha,
    },
    {
      step: "06",
      title: dict.landing.workflow.title6,
      description: dict.landing.workflow.desc6,
      color: theme.palette.kpi.purple,
      alpha: theme.palette.kpi.purple_alpha,
    },
  ];

  return (
    <Box sx={{ position: "relative", py: 10 }}>
      <Box
        sx={{
          position: "absolute",
          left: { xs: "20px", md: "50%" },
          top: 0,
          bottom: 0,
          background: `linear-gradient(to bottom, transparent, ${theme.palette.kpi.cyan_alpha.main_30}, ${theme.palette.kpi.indigo_alpha.main_30}, transparent)`,
          transform: { md: "translateX(-50%)" },
          zIndex: 0,
        }}
      />

      <Stack spacing={8}>
        {steps.map((item, index) => (
          <Box
            key={item.step}
            component={motion.div}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            sx={{
              display: "flex",
              flexDirection: {
                xs: "column",
                md: index % 2 === 0 ? "row" : "row-reverse",
              },
              alignItems: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: { xs: "100%", md: "45%" },
                textAlign: {
                  xs: "left",
                  md: index % 2 === 0 ? "right" : "left",
                },
                pl: { xs: "60px", md: 0 },
                pr: { xs: 0, md: 0 },
              }}
            >
              <Box
                sx={{
                  display: "inline-block",
                  p: 4,
                  borderRadius: "24px",
                  bgcolor: "rgba(8, 12, 24, 0.75)",
                  backdropFilter: "blur(20px)",
                  border: `1px solid ${item.alpha.main_20}`,
                  boxShadow: `0 8px 32px 0 ${item.alpha.main_05}`,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-5px)",
                    border: `1px solid ${item.alpha.main_40}`,
                    boxShadow: `0 12px 40px 0 ${item.alpha.main_10}`,
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: item.color,
                    fontWeight: 800,
                    letterSpacing: 2,
                    mb: 1,
                    fontSize: "14px",
                  }}
                >
                  {dict.common.step.toLocaleUpperCase('en-US')} {item.step}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, mb: 2, color: "#fff" }}
                >
                  {item.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255, 255, 255, 0.6)", lineHeight: 1.7 }}
                >
                  {item.description}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                position: "absolute",
                left: { xs: "20px", md: "50%" },
                top: { xs: "40px", md: "50%" },
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(8, 12, 24, 1)",
                border: `4px solid ${item.color}`,
                boxShadow: `0 0 20px ${item.color}`,
                transform: "translate(-50%, -50%)",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: item.color,
                }}
              />
            </Box>

            <Box sx={{ width: { xs: 0, md: "10%" } }} />
            <Box sx={{ width: { xs: "100%", md: "45%" } }} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
