import { Box, Grid, Stack, Typography } from "@mui/material";
import RouteIcon from "@mui/icons-material/Route";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

export default function OperationsRoutes() {
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
            id: "RTE-ALPHA",
            nodes: "BER → MUC → VIE",
            status: "OPTIMIZED",
            oldEta: "14:30",
            newEta: "13:45",
            saved: "45m",
            color: "#00f2ff",
          },
          {
            id: "RTE-BETA",
            nodes: "HAM → AMS → BRU",
            status: "REROUTING",
            oldEta: "18:00",
            newEta: "18:20",
            saved: "-20m",
            color: "#ffb4ab",
          },
          {
            id: "RTE-GAMMA",
            nodes: "CDG → FRA → ZRH",
            status: "CLEAR",
            oldEta: "22:15",
            newEta: "22:15",
            saved: "0m",
            color: "#7bd0ff",
          },
          {
            id: "RTE-DELTA",
            nodes: "MXP → FCO → NAP",
            status: "OPTIMIZED",
            oldEta: "09:00",
            newEta: "08:10",
            saved: "50m",
            color: "#00f2ff",
          },
        ].map((route) => (
          <Grid size={{ xs: 12, md: 6 }} key={route.id}>
            <Box
              className="glass-inner"
              sx={{
                p: 3,
                borderRadius: "4px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                transition: "all 0.3s ease",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  borderColor: `rgba(${
                    route.color === "#00f2ff" ? "0, 242, 255" : "255, 255, 255"
                  }, 0.3)`,
                },
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                mb={3}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: "4px",
                      bgcolor: "rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <RouteIcon sx={{ color: route.color, fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        color: "white",
                        fontWeight: 900,
                        fontSize: "0.875rem",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {route.id}
                    </Typography>
                    <Typography
                      sx={{
                        color: "rgba(255, 255, 255, 0.5)",
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        mt: 0.5,
                      }}
                    >
                      {route.nodes}
                    </Typography>
                  </Box>
                </Stack>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "2px",
                    bgcolor: `${route.color}22`,
                    border: `1px solid ${route.color}44`,
                  }}
                >
                  <Typography
                    sx={{
                      color: route.color,
                      fontSize: "0.625rem",
                      fontWeight: 900,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {route.status === "OPTIMIZED" ? "OPTIMIZED" :
                     route.status === "REROUTING" ? "REROUTING" :
                     "CLEAR"}
                  </Typography>
                </Box>
              </Stack>

              <Stack
                direction="row"
                justifyContent="space-between"
                sx={{
                  p: 2,
                  bgcolor: "rgba(0, 0, 0, 0.2)",
                  borderRadius: "4px",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
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
