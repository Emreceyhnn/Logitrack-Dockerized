"use client";

import { Box, Grid, Stack, Typography } from "@mui/material";
import RouteIcon from "@mui/icons-material/Route";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

export default function RoutesPanel() {
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
          {dict.landing.operations.routes.title}
        </Typography>
        <Box
          sx={{ flex: 1, height: "1px", bgcolor: "rgba(0, 242, 255, 0.2)" }}
        />
      </Stack>

      <Grid container spacing={3} sx={{ position: "relative", zIndex: 1 }}>
        {[
          {
            route: "BERLIN -> PARIS",
            oldEta: "14h 30m",
            newEta: "12h 15m",
            saved: "2h 15m",
            efficiency: "+18%",
          },
          {
            route: "VIENNA -> MILAN",
            oldEta: "8h 45m",
            newEta: "7h 50m",
            saved: "55m",
            efficiency: "+12%",
          },
          {
            route: "MADRID -> LYON",
            oldEta: "11h 20m",
            newEta: "9h 40m",
            saved: "1h 40m",
            efficiency: "+15%",
          },
          {
            route: "PRAGUE -> WARSAW",
            oldEta: "6h 15m",
            newEta: "5h 30m",
            saved: "45m",
            efficiency: "+9%",
          },
        ].map((route, i) => (
          <Grid size={{ xs: 12, lg: 6 }} key={i}>
            <Box
              className="glass-panel"
              sx={{
                p: 3,
                borderRadius: "4px",
                border: "1px solid rgba(0, 242, 255, 0.15)",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  borderColor: "#00f2ff",
                  boxShadow: "0 0 20px rgba(0, 242, 255, 0.1)",
                },
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "100px",
                  height: "100px",
                  background:
                    "radial-gradient(circle at top right, rgba(0, 242, 255, 0.1), transparent)",
                  pointerEvents: "none",
                }}
              />
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                mb={3}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <RouteIcon sx={{ color: "#00f2ff", fontSize: 20 }} />
                  <Typography
                    sx={{
                      color: "white",
                      fontWeight: 900,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {route.route}
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    bgcolor: "rgba(0, 242, 255, 0.1)",
                    border: "1px solid rgba(0, 242, 255, 0.3)",
                    borderRadius: "4px",
                  }}
                >
                  <Typography
                    sx={{
                      color: "#00f2ff",
                      fontSize: "0.625rem",
                      fontWeight: 900,
                    }}
                  >
                    EFF {route.efficiency}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography
                    sx={{
                      color: "rgba(255, 255, 255, 0.4)",
                      fontSize: "0.625rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      mb: 0.5,
                    }}
                  >
                    {dict.landing.operations.routes.originalEta}
                  </Typography>
                  <Typography
                    sx={{
                      color: "white",
                      opacity: 0.5,
                      textDecoration: "line-through",
                      fontFamily: "monospace",
                    }}
                  >
                    {route.oldEta}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      color: "rgba(255, 255, 255, 0.4)",
                      fontSize: "0.625rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      mb: 0.5,
                    }}
                  >
                    {dict.landing.operations.routes.optimizedEta}
                  </Typography>
                  <Typography
                    sx={{
                      color: "#00f2ff",
                      fontWeight: 900,
                      fontFamily: "monospace",
                    }}
                  >
                    {route.newEta}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      color: "rgba(255, 255, 255, 0.4)",
                      fontSize: "0.625rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      mb: 0.5,
                    }}
                  >
                    {dict.landing.operations.routes.timeSaved}
                  </Typography>
                  <Typography
                    sx={{
                      color: "#7bd0ff",
                      fontWeight: 900,
                      fontFamily: "monospace",
                    }}
                  >
                    {route.saved}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
