import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stack, Box, IconButton, useTheme, Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { View } from "@/app/lib/type/warehouseWorkerClient";
import type { Dictionary } from "@/app/lib/language/language";
import { buildDashboardHomeHref } from "@/app/lib/language/navigation";
import { Ico } from "./Ico";

interface WWSidebarProps {
  locked: boolean;
  lang: string;
  view: View;
  setView: (v: View) => void;
  worker: { initials: string };
  NAV: { key: View; title: string; d: string }[];
  onHelpClick?: () => void;
  dict?: Dictionary;
}

export default function WWSidebar({
  locked,
  lang,
  view,
  setView,
  worker,
  NAV,
  onHelpClick,
  dict,
}: WWSidebarProps) {
  const theme = useTheme();
  // Demo visitors must return to the demo overview — the real one is
  // protected and would bounce them to sign-in.
  const backHref = buildDashboardHomeHref(usePathname(), lang);

  return (
    <Stack
      data-tour="ww-sidebar"
      sx={{
        // Below md the rail is replaced by WWBottomNav — see that file for why.
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
        <Ico d="M3 21h18M4 21V9l8-4 8 4v12M9 21v-6h6v6" size={22} />
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
            data-tour="ww-help-btn"
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
              // Tinted + bordered so it reads as an action, not decoration, in
              // the narrow rail — the discoverability fix.
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
          color: "#fff"
        }}
      >
        {worker.initials}

      </Box>
    </Stack>
  );
}
