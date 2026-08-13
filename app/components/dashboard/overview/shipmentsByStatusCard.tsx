"use client";
import { Box, Divider, Stack, Typography, useTheme } from "@mui/material";
import CustomCard from "../../cards/card";
import { PieChart } from "@mui/x-charts";
import { useDrawingArea } from "@mui/x-charts/hooks";
import { styled } from "@mui/material/styles";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useMemo } from "react";

interface ShipmentOnStatusCardProps {
  values: string[];
}

const StyledText = styled("text")(({ theme }) => ({
  fill: theme.palette.text.primary,
  textAnchor: "middle",
  dominantBaseline: "central",
  fontSize: 24,
  fontWeight: 700,
  pointerEvents: "none",
}));

const StyledSubText = styled("text")(({ theme }) => ({
  fill: theme.palette.text.secondary,
  textAnchor: "middle",
  dominantBaseline: "central",
  fontSize: 12,
  fontWeight: 600,
  pointerEvents: "none",
}));

function PieCenterLabel({ total, label }: { total: number; label: string }) {
  const { width, height, left, top } = useDrawingArea();
  return (
    <>
      <StyledText x={left + width / 2} y={top + height / 2 - 8}>
        {total}
      </StyledText>
      <StyledSubText x={left + width / 2} y={top + height / 2 + 12}>
        {label}
      </StyledSubText>
    </>
  );
}

const ShipmentOnStatusCard = ({ values }: ShipmentOnStatusCardProps) => {
  const dict = useDictionary();
  const theme = useTheme();

  const data = useMemo(() => {
    if (!values) return [];

    const config: Record<string, { label: string; color: string }> = {
      PENDING: {
        label: dict.shipments.statuses.PENDING,
        color: theme.palette.kpi.sky,
      },
      ASSIGNED: {
        label: dict.shipments.statuses.ASSIGNED,
        color: theme.palette.kpi.cyan,
      },
      IN_TRANSIT: {
        label: dict.shipments.statuses.IN_TRANSIT,
        color: theme.palette.kpi.indigo,
      },
      DELIVERED: {
        label: dict.shipments.statuses.DELIVERED,
        color: theme.palette.kpi.emerald,
      },
      DELAYED: {
        label: dict.shipments.statuses.DELAYED,
        color: theme.palette.kpi.error,
      },
      CANCELLED: {
        label: dict.shipments.statuses.CANCELLED,
        color: theme.palette.error.main,
      },
    };

    const statusMapping: Record<string, string> = {
      PENDING: "PENDING",
      PROCESSING: "PENDING",
      PLANNED: "PENDING",
      ASSIGNED: "ASSIGNED",
      IN_TRANSIT: "IN_TRANSIT",
      DELIVERED: "DELIVERED",
      COMPLETED: "DELIVERED",
      DELAYED: "DELAYED",
      CANCELLED: "CANCELLED",
      FAILED: "CANCELLED",
    };

    const statusCounts = values.reduce<Record<string, number>>((acc, s) => {
      const mappedStatus = statusMapping[s] || "PENDING";
      acc[mappedStatus] = (acc[mappedStatus] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([key, value], index) => ({
      id: index,
      label: config[key]?.label || key,
      value,
      color: config[key]?.color || theme.palette.grey[300],
    }));
  }, [values, dict, theme]);

  if (!values) return null;
  const total = values.length;

  return (
    <CustomCard
      sx={{
        padding: "0 0 6px 0",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography sx={{ fontSize: 18, fontWeight: 600, p: 2 }}>
        {dict.dashboard.overview.shipmentsByStatus.title}
      </Typography>
      <Divider />

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 1,
        }}
      >
        {total === 0 ? (
          <Stack alignItems="center" spacing={2} sx={{ opacity: 0.5 }}>
            <LocalShippingIcon sx={{ fontSize: 48 }} />
            <Typography variant="body2">
              {dict.dashboard.overview.shipmentsByStatus.noShipments}
            </Typography>
          </Stack>
        ) : (
          <Box
            sx={{
              position: "relative",
              width: "100%",
              // Fill the card's available height rather than a fixed box, so the
              // donut sits in the real vertical centre and never bunches up top
              // with dead space below. minHeight keeps it usable when the card
              // is short; the extra floor accommodates a 2-line legend.
              flex: 1,
              minHeight: 320,
              display: "flex",
              justifyContent: "center",
              "& .MuiChartsLegend-root": {
                "& text": {
                  fontSize: "11px !important",
                  fontWeight: "600 !important",
                },
              },
            }}
          >
            <PieChart
              series={[
                {
                  data,
                  innerRadius: 50,
                  outerRadius: 85,
                  paddingAngle: 2,
                  cornerRadius: 6,
                  highlightScope: { fade: "global", highlight: "item" },
                  faded: { innerRadius: 40, color: "gray" },
                },
              ]}
              slotProps={{
                legend: {
                  direction: "horizontal",
                  position: { vertical: "bottom", horizontal: "center" },
                },
              }}
              // Reserve room below the donut for the legend (up to 2 rows) so it
              // never overlaps the ring; top margin keeps the donut off the divider.
              margin={{ top: 16, bottom: 72, left: 10, right: 10 }}
            >
              <PieCenterLabel
                total={total}
                label={dict.dashboard.overview.shipmentsByStatus.total}
              />
            </PieChart>
          </Box>
        )}
      </Box>
    </CustomCard>
  );
};

export default ShipmentOnStatusCard;
