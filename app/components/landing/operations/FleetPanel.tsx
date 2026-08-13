"use client";

import { Box, Stack, Typography } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SpeedIcon from "@mui/icons-material/Speed";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

export default function FleetPanel() {
  const dict = useDictionary();

  return (
    <Box
      sx={{
        flex: 1,
        p: 4,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        overflowY: "auto",
        bgcolor: "rgba(0, 0, 0, 0.4)",
        position: "relative",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          className: "bg-grid-pattern",
          opacity: 0.05,
          pointerEvents: "none",
        }}
      />
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ position: "relative", zIndex: 1 }}
      >
        <Typography
          className="font-label-md"
          sx={{
            color: "#00f2ff",
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            fontWeight: 900,
          }}
        >
          {dict.landing.operations.fleet.title}
        </Typography>
        <Box
          sx={{ flex: 1, height: "1px", bgcolor: "rgba(0, 242, 255, 0.2)" }}
        />
      </Stack>

      <Stack spacing={2} sx={{ position: "relative", zIndex: 1 }}>
        {[
          {
            id: "TRK-9042",
            dest: "Frankfurt Hub",
            status: "ON SCHEDULE",
            progress: 65,
            speed: "82 km/h",
          },
          {
            id: "TRK-8115",
            dest: "Rotterdam Port",
            status: "DELAYED",
            progress: 42,
            speed: "45 km/h",
            error: true,
          },
          {
            id: "TRK-7701",
            dest: "Munich Central",
            status: "ARRIVING",
            progress: 95,
            speed: "30 km/h",
          },
        ].map((truck) => (
          <Box
            key={truck.id}
            className="glass-inner"
            sx={{
              p: 2.5,
              borderRadius: "4px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "all 0.3s ease",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.05)",
                borderColor: "rgba(0, 242, 255, 0.3)",
              },
            }}
          >
            <Stack direction="row" spacing={3} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "8px",
                  bgcolor: truck.error
                    ? "rgba(255, 180, 171, 0.1)"
                    : "rgba(0, 242, 255, 0.1)",
                  border: `1px solid ${
                    truck.error
                      ? "rgba(255, 180, 171, 0.3)"
                      : "rgba(0, 242, 255, 0.3)"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LocalShippingIcon
                  sx={{
                    color: truck.error ? "#ffb4ab" : "#00f2ff",
                    fontSize: 24,
                  }}
                />
              </Box>
              <Box>
                <Typography
                  sx={{
                    color: "white",
                    fontWeight: 900,
                    fontSize: "1rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  {truck.id}
                </Typography>
                <Typography
                  sx={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                  }}
                >
                  {truck.dest}
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ width: "35%", display: { xs: "none", md: "block" } }}>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography
                  sx={{
                    color: truck.error ? "#ffb4ab" : "#00f2ff",
                    fontSize: "0.625rem",
                    letterSpacing: "0.1em",
                    fontWeight: 700,
                  }}
                >
                  {truck.status === "ON SCHEDULE" ? dict.landing.operations.fleet.onSchedule :
                   truck.status === "DELAYED" ? dict.landing.operations.fleet.delayed :
                   dict.landing.operations.fleet.arriving}
                </Typography>
                <Typography
                  sx={{
                    color: "white",
                    fontSize: "0.625rem",
                    fontFamily: "monospace",
                  }}
                >
                  {truck.progress}%
                </Typography>
              </Stack>
              <Box
                sx={{
                  width: "100%",
                  height: 4,
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 2,
                }}
              >
                <Box
                  sx={{
                    width: `${truck.progress}%`,
                    height: "100%",
                    bgcolor: truck.error ? "#ffb4ab" : "#00f2ff",
                    borderRadius: 2,
                    boxShadow: `0 0 10px ${
                      truck.error ? "#ffb4ab" : "#00f2ff"
                    }`,
                  }}
                />
              </Box>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <SpeedIcon
                sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 16 }}
              />
              <Typography
                sx={{
                  color: "white",
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                }}
              >
                {truck.speed}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
