import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stack, Box, IconButton, useTheme, Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { View } from "@/app/lib/type/driverConsoleClient";
import type { Dictionary } from "@/app/lib/language/language";
import { buildDashboardHomeHref } from "@/app/lib/language/navigation";
import { Ico } from "@/app/components/warehouse-worker/Ico";

interface DCSidebarProps {
  locked: boolean;
  lang: string;
  view: View;
  setView: (v: View) => void;
  driver: { initials: string } | null;
  NAV: { key: View; title: string; d: string }[];
  onHelpClick?: () => void;
  dict?: Dictionary;
}

export default function DCSidebar({
  locked,
  lang,
  view,
  setView,
  driver,
  NAV,
  onHelpClick,
  dict,
}: DCSidebarProps) {
  const theme = useTheme();
  // Demo visitors must return to the demo overview — the real one is
  // protected and would bounce them to sign-in.
  const backHref = buildDashboardHomeHref(usePathname(), lang);

  return (
    <Stack
      data-tour="dc-sidebar"
      sx={{
        // Below md the rail is replaced by DCBottomNav — see that file for why.
        display: { xs: "none", md: "flex" },
        width: 86,
        flexShrink: 0,
        bgcolor: theme.palette.background.sidebar,
        borderRight: `1px solid ${theme.palette.divider}`,
        alignItems: "center",
        py: 2,
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 3,
          background: "linear-gradient(135deg,#38bdf8 0%,#6366f1 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 2,
        }}
      >
        <Ico d="M3 17h1a2 2 0 1 0 4 0h8a2 2 0 1 0 4 0h1v-5l-3-4h-4v9M3 17V7h10v10M14 8h3l3 4" size={22} />
      </Box>
      {NAV.map((n) => {
        const active = view === n.key;
        return (
          <IconButton
            key={n.key}
            onClick={() => setView(n.key)}
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              color: active ? "#fff" : "rgba(255,255,255,0.5)",
              bgcolor: active ? "rgba(56,189,248,0.16)" : "transparent",
            }}
          >
            <Ico d={n.d} />
          </IconButton>
        );
      })}
      {!locked && (
        <IconButton
          component={Link}
          href={backHref}
          sx={{
            mt: "auto",
            width: 48,
            height: 48,
            borderRadius: 3,
            bgcolor: "rgba(255,255,255,0.03)",
            border: `1px solid ${theme.palette.divider}`,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <Ico d="M19 12H5M12 19l-7-7 7-7" size={20} />
        </IconButton>
      )}
      {onHelpClick && dict && (
        <Tooltip title={dict.common?.needHelp || "Need Help"} arrow placement="right">
          <Stack
            component="button"
            type="button"
            data-tour="dc-help-btn"
            onClick={onHelpClick}
            alignItems="center"
            spacing={0.25}
            sx={{
              mt: locked ? "auto" : 1,
              width: 60,
              py: 1,
              cursor: "pointer",
              font: "inherit",
              borderRadius: 3,
              bgcolor: "rgba(56,189,248,0.12)",
              border: `1px solid rgba(56,189,248,0.35)`,
              color: theme.palette.primary.main,
              transition: "background-color .15s, color .15s",
              ":hover": {
                bgcolor: "rgba(56,189,248,0.22)",
                color: "#fff",
              },
            }}
          >
            <HelpOutlineIcon sx={{ fontSize: 20 }} />
            <Box sx={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.3, lineHeight: 1 }}>
              {dict.common?.help || "Help"}
            </Box>
          </Stack>
        </Tooltip>
      )}
      <Box
        sx={{
          position: "relative",
          mt: 1,
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#1e293b,#0f172a)",
          border: `1px solid ${theme.palette.divider}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 800,
          color: "#fff",
        }}
      >
        {driver?.initials ?? "DR"}
      </Box>
    </Stack>
  );
}
