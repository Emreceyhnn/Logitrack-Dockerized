"use client";
import { useTheme, Box } from "@mui/material";
import StatCard from "../../cards/StatCard";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DirectionsBoatIcon from "@mui/icons-material/DirectionsBoat";
import InventoryIcon from "@mui/icons-material/Inventory";
import { ShipmentKpiCardProps } from "@/app/lib/type/shipment";
import KpiSkeleton from "@/app/components/skeletons/KpiSkeleton";
import { motion } from "framer-motion";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useMemo } from "react";

const ShipmentKpiCard = ({ state }: ShipmentKpiCardProps) => {
  const dict = useDictionary();
  const { stats, loading } = state;
  /* -------------------------------- variables ------------------------------- */
  const theme = useTheme();

  const kpiItems = useMemo(() => {
    const values = stats || { total: 0, active: 0, delayed: 0, inTransit: 0 };
    return [
      {
        label: dict.shipments.dashboard.totalShipments,
        value: values.total,
        icon: <InventoryIcon />,
        color: theme.palette.primary.main,
      },
      {
        label: dict.shipments.dashboard.activeShipments,
        value: values.active,
        icon: <LocalShippingIcon />,
        color: theme.palette.kpi.sky,
      },
      {
        label: dict.shipments.dashboard.delayedShipments,
        value: values.delayed,
        icon: <AccessTimeIcon />,
        color: theme.palette.kpi.error,
      },
      {
        label: dict.shipments.dashboard.inTransit,
        value: values.inTransit,
        icon: <DirectionsBoatIcon />,
        color: theme.palette.kpi.emerald,
      },
    ];
  }, [stats, theme, dict]);

  if (loading) {
    return <KpiSkeleton count={4} />;
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <Box
      component={motion.div}
      variants={container}
      initial="hidden"
      animate="show"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "stretch", // Ensure equal height in rows
        gap: 3,
        mt: 3,
        width: "100%",
        "& > *": {
          flex: {
            xs: "1 1 calc(100% - 24px)",
            sm: "1 1 calc(50% - 24px)",
            md: "1 1 calc(25% - 24px)",
          },
          display: "flex", // Support StatCard stretching
        },
      }}
    >
      {kpiItems.map((item, index) => (
        <Box
          key={index}
          sx={{
            width: {
              xs: "100%",
              sm: "calc(50% - 8px)",
              md: "calc(25% - 12px)",
            },
          }}
        >
          <StatCard
            title={item.label}
            value={item.value}
            icon={item.icon}
            color={item.color}
            sx={{ height: "100%" }}
          />
        </Box>
      ))}
    </Box>
  );
};

export default ShipmentKpiCard;
