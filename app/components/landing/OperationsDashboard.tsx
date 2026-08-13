"use client";

import { useState } from "react";
import { Box, Container, Grid, Stack, Typography } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import RouteIcon from "@mui/icons-material/Route";
import { motion } from "framer-motion";
import OverviewPanel from "./operations/OverviewPanel";
import FleetPanel from "./operations/FleetPanel";
import RoutesPanel from "./operations/RoutesPanel";

export default function OperationsDashboard() {
  const dict = useDictionary();
  const [activeTab, setActiveTab] = useState("overview");

  const sidebarItems = [
    {
      id: "overview",
      icon: <DashboardIcon sx={{ fontSize: 20 }} />,
      label: dict.landing.operations.tabs.overview,
    },
    {
      id: "fleet",
      icon: <LocalShippingIcon sx={{ fontSize: 20 }} />,
      label: dict.landing.operations.tabs.fleet,
    },
    {
      id: "routes",
      icon: <RouteIcon sx={{ fontSize: 20 }} />,
      label: dict.landing.operations.tabs.routes,
    },
  ];

  const getStats = () => {
    switch (activeTab) {
      case "fleet":
        return [
          { label: dict.landing.operations.stats.totalFleet, value: "842" },
          { label: dict.landing.operations.stats.inTransit, value: "615" },
          { label: dict.landing.operations.stats.maintenance, value: "24" },
          { label: dict.landing.operations.stats.onTime, value: "94.2", unit: "%" },
        ];
      case "routes":
        return [
          { label: dict.landing.operations.stats.activeRoutes, value: "412" },
          { label: dict.landing.operations.stats.fuelSaved, value: "12.4", unit: "%" },
          { label: dict.landing.operations.stats.timeSaved, value: "8.5", unit: "h" },
          { label: dict.landing.operations.stats.deviations, value: "3" },
        ];
      default:
        return [
          { label: dict.landing.operations.stats.activeUnits, value: "1,204" },
          { label: dict.landing.operations.stats.efficiency, value: "98.4", unit: "%" },
          { label: dict.landing.operations.stats.avgSpeed, value: "64", unit: "km/h" },
          { label: dict.landing.operations.stats.co2Reduced, value: "14.2", unit: "t" },
        ];
    }
  };

  const stats = getStats();

  return (
    <Box sx={{ py: 12, bgcolor: "#10141a", overflow: "hidden" }}>
      <Container maxWidth="xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Box
            className="glass-panel"
            sx={{
              width: "100%",
              borderRadius: "4px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 40px 100px -20px rgba(0,0,0,0.8)",
            }}
          >
            {/* Window Header */}
            <Box
              sx={{
                p: 2.5,
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "rgba(255, 255, 255, 0.03)",
              }}
            >
              <Stack direction="row" spacing={1.5}>
                {[1, 2, 3].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: "rgba(255, 255, 255, 0.2)",
                    }}
                  />
                ))}
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#00f2ff",
                    animation: "pulse 2s infinite",
                  }}
                />
                <Typography
                  className="font-label-md"
                  sx={{
                    fontSize: "0.75rem",
                    color: "white",
                    fontWeight: 700,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                  }}
                >
                  {dict.landing.operations.telemetry.globalCommand}
                </Typography>
              </Stack>
              <Box sx={{ width: 60 }} />
            </Box>

            {/* Content Area */}
            <Box
              sx={{
                display: "flex",
                height: { xs: "auto", md: 600 },
                className: "bg-grid-pattern",
              }}
            >
              {/* Sidebar */}
              <Box
                sx={{
                  width: 280,
                  borderRight: "1px solid rgba(255, 255, 255, 0.1)",
                  bgcolor: "rgba(0, 0, 0, 0.3)",
                  p: 4,
                  display: { xs: "none", lg: "flex" },
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <Stack spacing={1.5}>
                  {sidebarItems.map((item) => (
                    <Box
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      sx={{
                        px: 2,
                        py: 1.25,
                        borderRadius: "4px",
                        bgcolor:
                          activeTab === item.id
                            ? "rgba(0, 242, 255, 0.1)"
                            : "transparent",
                        border:
                          activeTab === item.id
                            ? "1px solid rgba(0, 242, 255, 0.4)"
                            : "1px solid transparent",
                        color:
                          activeTab === item.id
                            ? "#00f2ff"
                            : "rgba(255, 255, 255, 0.7)",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          bgcolor:
                            activeTab === item.id
                              ? "rgba(0, 242, 255, 0.15)"
                              : "rgba(255, 255, 255, 0.05)",
                        },
                      }}
                    >
                      {item.icon}
                      <Typography
                        className="font-label-md"
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        {item.label}
                      </Typography>
                    </Box>
                  ))}
                </Stack>

                <Box sx={{ mt: "auto" }}>
                  <Box
                    className="glass-inner"
                    sx={{
                      p: 2.5,
                      borderRadius: "4px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.625rem",
                        color: "rgba(255, 255, 255, 0.6)",
                        mb: 1.5,
                        letterSpacing: "0.2em",
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {dict.landing.operations.telemetry.nodeStatus}
                    </Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#00f2ff",
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 900,
                          color: "#00f2ff",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {dict.landing.operations.telemetry.systemsNominal}
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
              </Box>

              {/* Main Panel */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Stats Row */}
                <Grid
                  container
                  sx={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    bgcolor: "rgba(0, 0, 0, 0.2)",
                  }}
                >
                  {stats.map((stat, idx) => (
                    <Grid
                      size={{ xs: 6, md: 3 }}
                      key={stat.label}
                      sx={{
                        p: 4,
                        borderRight:
                          idx < stats.length - 1
                            ? "1px solid rgba(255, 255, 255, 0.1)"
                            : "none",
                      }}
                    >
                      <Typography
                        className="font-label-md"
                        sx={{
                          fontSize: "0.625rem",
                          color: "rgba(255, 255, 255, 0.7)",
                          textTransform: "uppercase",
                          mb: 1,
                          letterSpacing: "0.2em",
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 900, color: "white" }}
                      >
                        {stat.value}
                        {stat.unit && (
                          <Box
                            component="span"
                            sx={{
                              fontSize: "1rem",
                              color: "rgba(255, 255, 255, 0.3)",
                              ml: 0.5,
                            }}
                          >
                            {stat.unit}
                          </Box>
                        )}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>

                {/* Content Visualization */}
                {activeTab === "overview" && <OverviewPanel />}
                {activeTab === "fleet" && <FleetPanel />}
                {activeTab === "routes" && <RoutesPanel />}
              </Box>
            </Box>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
}
