import dynamic from "next/dynamic";
import { Stack, Box, Typography, useTheme } from "@mui/material";
import { Ico } from "@/app/components/warehouse-worker/Ico";
import type { DriverConsoleState } from "@/app/hooks/useDriverConsoleState";
import { DUTY_ORDER } from "@/app/lib/utils/driverConsoleUi";
import LanguageSwitcher from "../nav/LanguageSwitcher";
import UserAccountNav from "../nav/UserAccountNav";

// Mirrors DashboardHeader: the bell pulls the firebase SDK (~237 kB) in via
// useNotifications, so it is lazy-loaded to keep it out of this route's First
// Load JS. The 40px placeholder holds its slot while the chunk streams in.
const NotificationBell = dynamic(
  () => import("../notifications/NotificationBell"),
  { ssr: false, loading: () => <Box sx={{ width: 40, height: 40 }} /> }
);

const DUTY_COLORS: Record<string, { fg: string; bg: string; dot: string }> = {
  ON_JOB: { fg: "#0B0F19", bg: "#34D399", dot: "#34D399" },
  OFF_DUTY: { fg: "#fff", bg: "rgba(255,255,255,0.14)", dot: "#94a3b8" },
  ON_LEAVE: { fg: "#0B0F19", bg: "#f59e0b", dot: "#f59e0b" },
};

export default function DCHeader({
  state,
  showNotifications = true,
}: {
  state: DriverConsoleState;
  /** Demo panel opts out: it has no signed-in user, so the bell would render permanently empty. */
  showNotifications?: boolean;
}) {
  const theme = useTheme();
  const { dc, driver, licenseWarning, licenseDaysLeft, requestDutyChange } = state;

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        height: { xs: 62, md: 78 },
        bgcolor: theme.palette.background.sidebar,
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: { xs: 1.5, md: 3 },
        flexShrink: 0,
        gap: { xs: 1, md: 2 },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 1.25, md: 2 }}
        sx={{ minWidth: 0, flex: 1 }}
      >
        <Box
          sx={{
            // Hidden on the narrowest screens: the driver name and base code
            // carry the identity, and the glyph is what gives way first.
            display: { xs: "none", sm: "flex" },
            width: 46,
            height: 46,
            borderRadius: 3,
            bgcolor: "rgba(2,132,199,0.12)",
            color: "#0284c7",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Ico d="M3 21h18M4 21V9l8-4 8 4v12M9 21v-6h6v6" size={24} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            <Typography
              noWrap
              sx={{ fontSize: { xs: 15, md: 19 }, fontWeight: 700, minWidth: 0 }}
            >
              {driver?.name ?? "—"}
            </Typography>
            {driver?.homeBaseWarehouse && (
              <Box
                sx={{
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  color: theme.palette.primary.main,
                  bgcolor: `${theme.palette.primary.main}1f`,
                  px: 1,
                  py: 0.5,
                  borderRadius: 2,
                }}
              >
                {driver.homeBaseWarehouse.code}
              </Box>
            )}
            {licenseWarning && (
              <Box
                sx={{
                  // The full "expires in N days" copy has no room next to the
                  // name on a phone; the Documents tab still surfaces it.
                  display: { xs: "none", lg: "flex" },
                  flexShrink: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#f59e0b",
                  bgcolor: "rgba(245,158,11,0.14)",
                  px: 1,
                  py: 0.5,
                  borderRadius: 2,
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <Ico d="M12 3 2 20h20L12 3zM12 10v4M12 17h.01" size={12} />
                {dc.dashboard.licenseExpiringSoon.replace("{days}", String(licenseDaysLeft))}
              </Box>
            )}
          </Stack>
          <Typography
            noWrap
            sx={{
              // The shortened 62px mobile header has no room for a second line.
              display: { xs: "none", md: "block" },
              fontSize: 12,
              color: theme.palette.text.secondary,
            }}
          >
            {driver?.homeBaseWarehouse
              ? `${driver.homeBaseWarehouse.name} · ${driver.homeBaseWarehouse.city}`
              : dc.noDriverProfile}
          </Typography>
        </Box>
      </Stack>

      {/* Duty switcher: three labelled pills need more room than a phone header
          has once the name and account block are placed. Below md the identical
          control on the dashboard hero card carries it instead. */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
          display: { xs: "none", md: "flex" },
          bgcolor: "rgba(255,255,255,0.04)",
          p: 0.5,
          borderRadius: 3,
          flexShrink: 0,
        }}
      >
        {DUTY_ORDER.map((k) => {
          const active = driver?.status === k;
          const colors = DUTY_COLORS[k];
          return (
            <Box
              key={k}
              component="button"
              type="button"
              onClick={() => void requestDutyChange(k)}
              sx={{
                px: 1.75,
                py: 1,
                borderRadius: 2.25,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                border: "none",
                font: "inherit",
                color: active ? colors?.fg : "rgba(255,255,255,0.55)",
                bgcolor: active ? colors?.bg : "transparent",
                transition: "background-color .15s, color .15s",
              }}
            >
              {dc.duty[k]}
            </Box>
          );
        })}
      </Stack>

      {/* Notifications, profile & language */}
      <Stack
        direction="row"
        spacing={{ xs: 0.5, md: 2 }}
        alignItems="center"
        // Without this the account block keeps its natural width and overlaps
        // the driver name on a narrow header.
        sx={{ ml: { xs: 0, md: 1 }, flexShrink: 0, minWidth: 0 }}
      >
        {showNotifications && <NotificationBell user={null} />}
        <LanguageSwitcher />
        <UserAccountNav user={null} />
      </Stack>
    </Stack>
  );
}
