"use client";

import { useState } from "react";
import {
  Box,
  Stack,
  IconButton,
  Drawer,
  useTheme,
  Avatar,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Badge,
  Popover,
  Chip,
  Tooltip,
  Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { AuthenticatedUser } from "@/app/lib/auth-middleware";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { buildLocalizedHref } from "@/app/lib/language/navigation";
import DashboardBreadcrumbs from "./DashboardBreadcrumbs";
import SideBar from "../sidebar";

/**
 * Demo-only counterpart to DashboardHeader — same visual chrome (breadcrumbs,
 * sticky blur header, right-side icon stack) but every interactive element is
 * safe for an anonymous visitor: no useNotifications (real Firebase stream),
 * no getUserSession/logoutAction, no ProfileDialog/SettingsDialog mutations.
 */
export default function DemoDashboardHeader({
  user,
}: {
  user: AuthenticatedUser | null;
}) {
  const theme = useTheme();
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const dict = useDictionary();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [bellAnchorEl, setBellAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleDisabled = () => {
    toast.info(dict.toasts.demoActionDisabled);
  };

  const handleExitDemo = () => {
    router.push(buildLocalizedHref("/", lang));
  };

  const mockNotifications = [
    { title: "Shipment SHP-10432 delayed", time: "5m ago" },
    { title: "Vehicle 34 ABC 123 needs service", time: "1h ago" },
    { title: "New driver assignment completed", time: "3h ago" },
  ];

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
        <Tooltip title={dict.common.backToHome || "Back to Home"} arrow>
          <Button
            variant="outlined"
            size="small"
            startIcon={<HomeRoundedIcon sx={{ fontSize: 18 }} />}
            onClick={handleExitDemo}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.8rem",
              borderRadius: "999px",
              px: 2,
              py: 0.5,
              borderColor: theme.palette.primary._alpha.main_30,
              color: theme.palette.primary.main,
              bgcolor: theme.palette.primary._alpha.main_05,
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: theme.palette.primary.main,
                bgcolor: theme.palette.primary._alpha.main_10,
                transform: "translateY(-1px)",
                boxShadow: `0 4px 12px ${theme.palette.primary._alpha.main_20}`,
              },
            }}
          >
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              {dict.common.home || "Home"}
            </Box>
          </Button>
        </Tooltip>
        <IconButton
          onClick={(e) => setBellAnchorEl(e.currentTarget)}
          aria-label="notifications"
        >
          <Badge badgeContent={mockNotifications.length} color="error">
            <NotificationsOutlinedIcon />
          </Badge>
        </IconButton>

        <Popover
          open={Boolean(bellAnchorEl)}
          anchorEl={bellAnchorEl}
          onClose={() => setBellAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { width: 320, borderRadius: 2, p: 1 } } }}
        >
          <Stack spacing={0.5} sx={{ p: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ px: 1, pb: 0.5 }}>
              {dict.notifications.title}
            </Typography>
            {mockNotifications.map((n, i) => (
              <Box
                key={i}
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: 1.5,
                  "&:hover": { bgcolor: theme.palette.action.hover },
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {n.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {n.time}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Popover>

        <Box
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            cursor: "pointer",
            padding: "4px 12px",
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            "&:hover": { bgcolor: theme.palette.action.hover },
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: theme.palette.primary._alpha.main_10,
              color: theme.palette.primary.main,
              fontWeight: 800,
              fontSize: "0.75rem",
            }}
          >
            {user?.name?.[0]}
            {user?.surname?.[0]}
          </Avatar>
          <Stack spacing={-0.5} sx={{ display: { xs: "none", sm: "flex" } }}>
            <Typography variant="body2" fontWeight={800} sx={{ fontSize: "0.85rem" }}>
              {user?.name} {user?.surname}
            </Typography>
            <Chip
              label="DEMO"
              size="small"
              sx={{
                height: 14,
                fontSize: 9,
                fontWeight: 700,
                bgcolor: theme.palette.primary._alpha.main_10,
                color: theme.palette.primary.main,
              }}
            />
          </Stack>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              handleDisabled();
            }}
            sx={{ gap: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: "auto !important" }}>
              <PersonIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
            </ListItemIcon>
            {dict.common.profile}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              handleDisabled();
            }}
            sx={{ gap: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: "auto !important" }}>
              <SettingsIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
            </ListItemIcon>
            {dict.common.settings}
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              handleExitDemo();
            }}
            sx={{ gap: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: "auto !important" }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            {dict.common.logout}
          </MenuItem>
        </Menu>
      </Stack>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 280 },
        }}
      >
        <SideBar onMobileClose={handleDrawerToggle} isDemo />
      </Drawer>
    </Box>
  );
}
