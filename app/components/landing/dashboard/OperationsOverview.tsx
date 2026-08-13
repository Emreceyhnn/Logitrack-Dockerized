import { Box, Stack, Typography } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

export default function OperationsOverview() {
  const dict = useDictionary();

  return (
    <Box
      sx={{
        flex: 1,
        p: 4,
        position: "relative",
        bgcolor: "rgba(0, 0, 0, 0.4)",
      }}
    >
      <Box
        className="glass-inner"
        sx={{
          width: "100%",
          height: "100%",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "4px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Advanced Telemetry Background Layer */}
        <Box
          className="bg-grid-pattern"
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.15,
          }}
        />

        {/* Central Radial Glow */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at center, rgba(0, 242, 255, 0.15) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />

        {/* Radar Rings */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "250px", md: "400px" },
            height: { xs: "250px", md: "400px" },
            borderRadius: "50%",
            border: "1px solid rgba(0, 242, 255, 0.2)",
            pointerEvents: "none",
            "&::before": {
              content: '""',
              position: "absolute",
              top: "15%",
              left: "15%",
              right: "15%",
              bottom: "15%",
              borderRadius: "50%",
              border: "1px solid rgba(0, 242, 255, 0.1)",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              top: "35%",
              left: "35%",
              right: "35%",
              bottom: "35%",
              borderRadius: "50%",
              border: "1px dashed rgba(0, 242, 255, 0.15)",
            }
          }}
        />

        {/* Radar Crosshairs */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(0, 242, 255, 0.3) 50%, transparent 100%)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: "1px",
            background: "linear-gradient(180deg, transparent 0%, rgba(0, 242, 255, 0.3) 50%, transparent 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Sweeping Radar Scanner */}
        <Box
          className="animate-spin"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: { xs: "250px", md: "400px" },
            height: { xs: "250px", md: "400px" },
            mt: { xs: "-125px", md: "-200px" },
            ml: { xs: "-125px", md: "-200px" },
            borderRadius: "50%",
            background: "conic-gradient(from 0deg, transparent 70%, rgba(0, 242, 255, 0.1) 95%, rgba(0, 242, 255, 0.4) 100%)",
            pointerEvents: "none",
            animationDuration: "4s",
            willChange: "transform",
          }}
        />

        {/* Data Nodes */}
        {[
          { top: "30%", left: "40%", delay: "0s" },
          { top: "60%", left: "65%", delay: "1s" },
          { top: "25%", left: "70%", delay: "0.5s" },
          { top: "75%", left: "35%", delay: "1.5s" },
          { top: "45%", left: "20%", delay: "0.2s" },
        ].map((node, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              top: node.top,
              left: node.left,
              width: 6,
              height: 6,
              bgcolor: "#00f2ff",
              borderRadius: "50%",
              boxShadow: "0 0 10px #00f2ff, 0 0 20px #00f2ff",
              "&::after": {
                content: '""',
                position: "absolute",
                top: -4,
                left: -4,
                right: -4,
                bottom: -4,
                borderRadius: "50%",
                border: "1px solid rgba(0, 242, 255, 0.5)",
                animation: "pulse 2s infinite",
                animationDelay: node.delay,
                willChange: "opacity, transform",
              }
            }}
          />
        ))}

        {/* Simulation Content */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Box
              sx={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 80,
                height: 80,
                border: "1px solid rgba(0, 242, 255, 0.4)",
                boxShadow: "0 0 30px rgba(0, 242, 255, 0.1)",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: "rgba(0, 242, 255, 0.1)",
                  animation: "pulse 2s infinite",
                }}
              />
              <MyLocationIcon sx={{ color: "#00f2ff", fontSize: 40 }} />
            </Box>
            <Typography
              className="font-label-md"
              sx={{
                fontSize: "0.75rem",
                color: "#00f2ff",
                textTransform: "uppercase",
                letterSpacing: "0.4em",
                fontWeight: 900,
              }}
            >
              {dict.landing.operations.telemetry.title}
            </Typography>
          </Box>
        </Box>

        {/* Coordinates */}
        <Typography
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            fontSize: "0.625rem",
            fontFamily: "monospace",
            color: "rgba(255, 255, 255, 0.4)",
          }}
        >
          X: 402.192 / Y: 881.042
        </Typography>

        {/* Alert Card */}
        <Box
          className="glass-panel"
          sx={{
            position: "absolute",
            top: 24,
            right: 24,
            width: 280,
            p: 3,
            borderRadius: "4px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            display: { xs: "none", md: "block" },
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Box
              sx={{
                p: 0.75,
                borderRadius: "4px",
                bgcolor: "rgba(0, 242, 255, 0.1)",
              }}
            >
              <NotificationsActiveIcon
                sx={{ color: "#00f2ff", fontSize: 16 }}
              />
            </Box>
            <Typography
              className="font-label-md"
              sx={{
                fontSize: "0.625rem",
                color: "white",
                fontWeight: 900,
                textTransform: "uppercase",
              }}
            >
              {dict.landing.operations.telemetry.activeIntelligence}
            </Typography>
          </Stack>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              p: 1.5,
              borderRadius: "4px",
              bgcolor: "rgba(255, 255, 255, 0.05)",
            }}
          >
            <Box
              sx={{
                width: 4,
                bgcolor: "#00f2ff",
                borderRadius: "2px",
              }}
            />
            <Box>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "white",
                  fontWeight: 700,
                }}
              >
                {dict.landing.operations.telemetry.routeOptimized.replace("{id}", "HK-942")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.625rem",
                  color: "rgba(255, 255, 255, 0.7)",
                  mt: 0.5,
                }}
              >
                {dict.landing.operations.telemetry.efficiencyIncreased.replace("{value}", "4.2")}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Log Terminal */}
        <Box
          className="glass-inner"
          sx={{
            position: "absolute",
            bottom: 24,
            left: 24,
            width: 300,
            height: 160,
            p: 2.5,
            borderRadius: "4px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            display: { xs: "none", xl: "block" },
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              pb: 1,
              mb: 1.5,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.625rem",
                color: "rgba(255, 255, 255, 0.6)",
                fontWeight: 900,
                textTransform: "uppercase",
              }}
            >
              {dict.landing.operations.telemetry.systemLog}
            </Typography>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "#00f2ff",
              }}
            />
          </Stack>
          <Box
            sx={{
              color: "rgba(0, 242, 255, 0.8)",
              fontFamily: "monospace",
              fontSize: "0.625rem",
            }}
          >
            <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
              <Box component="span" sx={{ opacity: 0.5 }}>
                [09:42:01]
              </Box>
              <Box component="span">RTE_MOD_SYNC_SUCCESS</Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
              <Box component="span" sx={{ opacity: 0.5 }}>
                [09:42:04]
              </Box>
              <Box component="span" sx={{ color: "#7bd0ff" }}>
                DATA_STREAM_NODE_7B
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
              <Box component="span" sx={{ opacity: 0.5 }}>
                [09:42:08]
              </Box>
              <Box component="span">GEO_FENCE_VLD_PRX</Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
              <Box component="span" sx={{ opacity: 0.5 }}>
                [09:42:12]
              </Box>
              <Box component="span" sx={{ color: "#ffb4ab" }}>
                WARN: CONGESTION_LHR
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Box component="span" sx={{ opacity: 0.5 }}>
                [09:42:15]
              </Box>
              <Box component="span">REROUTING_CALC_DONE</Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
