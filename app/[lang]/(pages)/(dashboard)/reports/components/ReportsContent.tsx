"use client";

import { useState } from "react";
import { Box, Typography, Tabs, Tab, CircularProgress } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import InventoryIcon from "@mui/icons-material/Inventory";

import dynamic from "next/dynamic";
import ChartSkeleton from "@/app/components/skeletons/ChartSkeleton";

// @mui/x-charts is ~283 kB per route when imported statically. Loading the
// chart components lazily keeps it out of this route's First Load JS.
const ShipmentCharts = dynamic(
  () => import("@/app/components/dashboard/reports/ShipmentCharts"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const FleetCharts = dynamic(
  () => import("@/app/components/dashboard/reports/FleetCharts"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const InventoryCharts = dynamic(
  () => import("@/app/components/dashboard/reports/InventoryCharts"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
import ReportSummaryCards from "@/app/components/dashboard/reports/ReportSummaryCards";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useReportsData } from "@/app/hooks/useReports";
import QueryErrorState from "@/app/components/ui/QueryErrorState";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ReportsContent() {
  const dict = useDictionary();
  const { state, actions } = useReportsData();
  const [tabIndex, setTabIndex] = useState(0);

  /* -------------------------------- handlers -------------------------------- */
  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  if (state.error && !state.data) {
    return (
      <Box sx={{ p: 3 }}>
        <QueryErrorState onRetry={() => actions.fetchReports()} />
      </Box>
    );
  }

  if (state.loading && !state.data) {
    return (
      <Box
        sx={{
          p: 3,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 5 }}>
        <Typography
          variant="h3" component="h1"
          fontWeight={800}
          sx={{ mb: 1, letterSpacing: "-0.02em" }}
        >
          {dict.reports.title}
        </Typography>
        <Typography variant="h6" color="text.secondary" fontWeight={400}>
          {dict.reports.subtitle}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Tabs
          data-tour="report-tabs"
          value={tabIndex}
          onChange={handleChange}
          aria-label="report tabs"
          variant="standard"
          sx={{
            minHeight: 48,
            overflow: "visible",
            "& .MuiTabs-indicator": {
              display: "none", // Hide default indicator for the folder look
            },
            "& .MuiTabs-scroller": {
              overflow: "visible !important",
            },
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 700,
              fontSize: "1rem",
              minHeight: 48,
              mr: 1,
              px: 3,
              borderRadius: "12px 12px 0 0",
              transition: "all 0.2s",
              color: "text.secondary",
              border: 1,
              borderColor: "transparent",
              borderBottom: "none",
              position: "relative",
              top: "1px", // Overlap the border of the content box below
              zIndex: 0,
              "&.Mui-selected": {
                color: "primary.main",
                bgcolor: "background.paper",
                borderColor: "divider",
                zIndex: 2,
              },
              "&:hover:not(.Mui-selected)": {
                color: "text.primary",
                bgcolor: "action.hover",
              },
            },
          }}
        >
          <Tab
            icon={<LocalShippingIcon fontSize="small" />}
            iconPosition="start"
            label={dict.reports.tabs.shipment}
          />
          <Tab
            icon={<DirectionsCarIcon fontSize="small" />}
            iconPosition="start"
            label={dict.reports.tabs.fleet}
          />
          <Tab
            icon={<InventoryIcon fontSize="small" />}
            iconPosition="start"
            label={dict.reports.tabs.inventory}
          />
        </Tabs>
      </Box>

      <Box
        data-tour="report-content"
        sx={{
          bgcolor: "background.paper",
          borderRadius: "12px",
          borderTopLeftRadius: tabIndex === 0 ? 0 : 12,
          border: 1,
          borderColor: "divider",
          p: { xs: 2, md: 3 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <ReportSummaryCards
          tabIndex={tabIndex}
          metrics={state.data?.metrics}
          loading={state.loading}
          dict={dict}
        />

        <Box sx={{ mt: 2 }}>
          <CustomTabPanel value={tabIndex} index={0}>
            <ShipmentCharts
              data={state.data?.shipments ?? null}
              loading={state.loading}
              dict={dict}
            />
          </CustomTabPanel>
          <CustomTabPanel value={tabIndex} index={1}>
            <FleetCharts data={state.data?.fleet || []} dict={dict} />
          </CustomTabPanel>
          <CustomTabPanel value={tabIndex} index={2}>
            <InventoryCharts
              data={state.data?.inventory?.categoryStats || {}}
              dict={dict}
            />
          </CustomTabPanel>
        </Box>
      </Box>
    </Box>
  );
}
