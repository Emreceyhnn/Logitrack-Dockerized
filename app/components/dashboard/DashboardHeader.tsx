import { useState } from "react";
import { Box, Stack, IconButton, Drawer, useTheme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import dynamic from "next/dynamic";
import UserAccountNav from "../nav/UserAccountNav";
import { AuthenticatedUser } from "@/app/lib/auth-middleware";
import DashboardBreadcrumbs from "./DashboardBreadcrumbs";
import SideBar from "../sidebar";

// NotificationBell drags the whole firebase SDK (~237 kB) with it via
// useNotifications → lib/firebase. Lazy-loading it keeps firebase out of
// every dashboard route's First Load JS; the bell mounts right after
// hydration instead of blocking it. The 40px placeholder prevents layout
// shift in the header while the chunk streams in.
const NotificationBell = dynamic(() => import("../notifications/NotificationBell"), {
  ssr: false,
  loading: () => <Box sx={{ width: 40, height: 40 }} />,
});


export default function DashboardHeader({
  user,
}: {
  user: AuthenticatedUser | null;
}) {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box
      component="header"
      sx={{
        px: { xs: 2, md: 4 },
        py: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor:
          theme.palette.mode === "dark"
            ? "rgba(11, 15, 25, 0.7)"
            : "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(12px) saturate(180%)",
        borderBottom: "1px solid",
        borderColor: theme.palette.divider_alpha.main_10,
        position: "sticky",
        top: 0,
        zIndex: 999,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 1, display: { md: "none" } }}
        >
          <MenuIcon />
        </IconButton>
        <DashboardBreadcrumbs />
      </Stack>

      <Stack direction="row" spacing={{ xs: 1.5, md: 3 }} alignItems="center">
        <Box>
          <NotificationBell user={user} />
        </Box>
        <Box>
          <UserAccountNav user={user} />
        </Box>
      </Stack>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 280 },
        }}
      >
        <SideBar onMobileClose={handleDrawerToggle} />
      </Drawer>
    </Box>
  );
}
