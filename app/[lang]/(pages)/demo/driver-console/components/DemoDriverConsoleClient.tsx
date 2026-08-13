"use client";

import {
  Box,
  Stack,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  useTheme,
} from "@mui/material";
import DCSidebar from "@/app/components/driver-console/DCSidebar";
import DCBottomNav, {
  DC_BOTTOM_NAV_HEIGHT,
} from "@/app/components/driver-console/DCBottomNav";
import DCHeader from "@/app/components/driver-console/DCHeader";
import GuidedTourOverlay from "@/app/components/guidedTour/GuidedTourOverlay";
import { useDemoDriverConsoleState } from "@/app/hooks/demo/useDemoDriverConsoleState";
import type { DriverConsoleState } from "@/app/hooks/useDriverConsoleState";

import DCDashboardTab from "@/app/components/driver-console/tabs/DCDashboardTab";
import DCRouteTab from "@/app/components/driver-console/tabs/DCRouteTab";
import DCShipmentsTab from "@/app/components/driver-console/tabs/DCShipmentsTab";
import DCVehicleTab from "@/app/components/driver-console/tabs/DCVehicleTab";
import DCDocumentsTab from "@/app/components/driver-console/tabs/DCDocumentsTab";

interface ExtendedPalette {
  kpi?: { emerald?: string; amber?: string; cyan?: string };
}

/**
 * Demo-only fork of DriverConsoleClient. Identical layout/tabs, but backed by
 * useDemoDriverConsoleState (public mock data, every mutation → "disabled in
 * demo" toast). `locked` is always false so the full panel is shown, and the
 * first-run auto-tour is dropped to keep the demo predictable.
 */
export default function DemoDriverConsoleClient({ lang = "en" }: { lang?: string }) {
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  // The demo state hook mirrors useDriverConsoleState's return shape exactly,
  // so the shared tabs (typed against DriverConsoleState) render unchanged.
  const state = useDemoDriverConsoleState() as unknown as DriverConsoleState;
  const {
    dc,
    view,
    setView,
    driver,
    NAV,
    handleHelpClick,
    toast,
    setToast,
    pendingDutyChange,
    confirmDutyChange,
    cancelDutyChange,
  } = state;

  return (
    <Stack
      direction="row"
      sx={{
        height: "100vh",
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
        overflow: "hidden",
        fontFamily: "inherit",
      }}
    >
      <DCSidebar
        locked={false}
        lang={lang}
        view={view}
        setView={setView}
        driver={driver}
        NAV={NAV}
        onHelpClick={handleHelpClick}
        dict={state.dict}
      />

      <Stack sx={{ flex: 1, overflow: "hidden" }}>
        <DCHeader state={state} showNotifications={false} />

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            p: { xs: 1.5, sm: 2, md: 3 },
            // The bottom nav is fixed, so the last card would sit under it
            // without this reserved gutter (plus the iOS home indicator).
            pb: {
              xs: `calc(${DC_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom) + 16px)`,
              md: 3,
            },
            "&::-webkit-scrollbar": { width: 9, height: 9 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "rgba(255,255,255,0.12)",
              borderRadius: 9,
              border: `2px solid ${theme.palette.background.default}`,
            },
          }}
        >
          {view === "dashboard" && <DCDashboardTab state={state} />}
          {view === "route" && <DCRouteTab state={state} />}
          {view === "shipments" && <DCShipmentsTab state={state} />}
          {view === "vehicle" && <DCVehicleTab state={state} />}
          {view === "documents" && <DCDocumentsTab state={state} />}
        </Box>
      </Stack>

      <DCBottomNav
        locked={false}
        lang={lang}
        view={view}
        setView={setView}
        NAV={NAV}
        onHelpClick={handleHelpClick}
        dict={state.dict}
      />

      <Dialog open={!!pendingDutyChange} onClose={cancelDutyChange}>
        <DialogTitle>{dc.dashboard.confirmDutyChangeTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dc.dashboard.confirmDutyChangeBody.replace(
              "{status}",
              pendingDutyChange ? dc.duty[pendingDutyChange] : ""
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDutyChange}>{dc.dashboard.confirmCancel}</Button>
          <Button onClick={confirmDutyChange} variant="contained" color="warning">
            {dc.dashboard.confirmYes}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2600}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert
            severity={toast.tone}
            sx={{
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              fontWeight: 600,
              "& .MuiAlert-icon": {
                color:
                  toast.tone === "success"
                    ? paletteTheme.kpi?.emerald
                    : toast.tone === "warning"
                      ? paletteTheme.kpi?.amber
                      : toast.tone === "error"
                        ? theme.palette.error.main
                        : paletteTheme.kpi?.cyan,
              },
            }}
          >
            {toast.msg}
          </Alert>
        ) : (
          <div />
        )}
      </Snackbar>

      <GuidedTourOverlay />
    </Stack>
  );
}
