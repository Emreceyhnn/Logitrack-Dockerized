"use client";

import { Box, Container, Stack, Typography } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import ApartmentIcon from "@mui/icons-material/Apartment";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import PublicIcon from "@mui/icons-material/Public";

export default function SocialProof() {
  const dict = useDictionary();

  const partners = [
    { name: "LUMEN-FLOW", icon: <ApartmentIcon sx={{ fontSize: 32 }} /> },
    { name: "NEXUS-GRID", icon: <RocketLaunchIcon sx={{ fontSize: 32 }} /> },
    {
      name: "VELO-SYNC",
      icon: <PrecisionManufacturingIcon sx={{ fontSize: 32 }} />,
    },
    { name: "AERO-SHIFT", icon: <PublicIcon sx={{ fontSize: 32 }} /> },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        py: 8,
        bgcolor: "transparent",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={6} alignItems="center">
          <Typography
            className="font-label-md"
            sx={{
              fontSize: "0.75rem",
              color: "rgba(255, 255, 255, 0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.4em",
              textAlign: "center",
            }}
          >
            {dict.landing.trusted}
          </Typography>

          <Stack
            direction="row"
            flexWrap="wrap"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              width: "100%",
              gap: 4,
              opacity: 0.5,
              filter: "grayscale(100%)",
              transition: "all 0.5s ease",
              "&:hover": {
                opacity: 1,
                filter: "grayscale(0%)",
              },
            }}
          >
            {partners.map((partner) => (
              <Stack
                key={partner.name}
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  color: "white",
                  "&:hover": {
                    color: "#00f2ff",
                  },
                  transition: "color 0.3s ease",
                }}
              >
                {partner.icon}
                <Typography
                  sx={{
                    fontWeight: 900,
                    letterSpacing: "-0.05em",
                    fontSize: "1.25rem",
                  }}
                >
                  {partner.name}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
