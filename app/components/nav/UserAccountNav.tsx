"use client";

import React, { useState, useEffect } from "react";
import {
  Stack,
  CircularProgress,
  Avatar,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Box,
  useTheme,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { useParams } from "next/navigation";
import { getUserSession, logoutAction } from "@/app/lib/actions/auth";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import ProfileDialog from "../dialogs/profile/ProfileDialog";
import SettingsDialog from "../dialogs/settings/SettingsDialog";
import LogoutConfirmationDialog from "../dialogs/logoutConfirmationDialog";
import { AuthenticatedUser } from "@/app/lib/auth-middleware";

export default function UserAccountNav({
  user: initialUser,
}: {
  user: AuthenticatedUser | null;
}) {
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const params = useParams();
  const lang = (params?.lang as string) || "tr";
  const dict = useDictionary();

  const isLight = theme.palette.mode === "light";
  const menuPaperSx = {
    overflow: "visible",
    filter: isLight
      ? "drop-shadow(0px 8px 16px rgba(0,0,0,0.1))"
      : "drop-shadow(0px 8px 16px rgba(0,0,0,0.4))",
    mt: 1.5,
    borderRadius: 3,
    bgcolor: theme.palette.background.paper,
    backdropFilter: "blur(12px)",
    border: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.primary,
    padding: "4px",
    "& .MuiMenuItem-root": {
      borderRadius: 1.5,
      mx: 0.5,
      my: 0.25,
      px: 1.5,
      py: 1,
      fontSize: "0.85rem",
      fontWeight: 600,
      transition: "all 0.2s",
      "&:hover": {
        bgcolor: theme.palette.action.hover,
      },
    },
    "& .MuiAvatar-root": { width: 32, height: 32, ml: -0.5, mr: 1 },
    "&::before": {
      content: '""',
      display: "block",
      position: "absolute",
      top: 0,
      right: 14,
      width: 10,
      height: 10,
      bgcolor: theme.palette.background.paper,
      transform: "translateY(-50%) rotate(45deg)",
      zIndex: 0,
      borderLeft: `1px solid ${theme.palette.divider}`,
      borderTop: `1px solid ${theme.palette.divider}`,
    },
  };

  /* --------------------------------- STATES --------------------------------- */
  const [loading, setLoading] = useState(!initialUser);
  const [user, setUser] = useState<AuthenticatedUser | null>(initialUser);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  /* --------------------------------- ACTIONS -------------------------------- */
  const fetchSession = async () => {
    try {
      const session = await getUserSession();
      setUser(session as AuthenticatedUser | null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------- LIFECYCLE ------------------------------- */

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    } else {
      fetchSession();
    }
  }, [initialUser]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchSession();
    };
    window.addEventListener("profile-updated", handleProfileUpdate);
    return () =>
      window.removeEventListener("profile-updated", handleProfileUpdate);
  }, []);

  /* -------------------------------- HANDLERS -------------------------------- */
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleOpenProfile = () => {
    handleMenuClose();
    setProfileOpen(true);
  };

  const handleOpenSettings = () => {
    handleMenuClose();
    setSettingsOpen(true);
  };

  const handleLogout = async () => {
    await logoutAction();
    window.location.href = `/${lang}`;
  };

  /* -------------------------------- RENDER ------------------------------- */
  if (loading) {
    return (
      <CircularProgress size={20} sx={{ color: theme.palette.primary.main }} />
    );
  }

  if (!user) return null;

  return (
    <>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ height: 40 }}
      >
        {/* <LanguageSwitcher /> */}
        <Box
          onClick={handleMenuOpen}
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            height: 40,
            boxSizing: "border-box",
            gap: 1.5,
            cursor: "pointer",
            padding: "0 12px",
            borderRadius: 3,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            bgcolor: isLight
              ? theme.palette.grey[100]
              : theme.palette.common.white_alpha.main_02,
            border: `1px solid ${theme.palette.divider}`,
            "&:hover": {
              bgcolor: theme.palette.primary._alpha.main_08,
              borderColor: theme.palette.primary._alpha.main_20,
              transform: "translateY(-1px)",
              boxShadow: isLight
                ? `0 4px 20px rgba(0,0,0,0.05)`
                : `0 4px 20px ${theme.palette.common.black_alpha.main_30}`,
            },
          }}
        >
          <Avatar
            src={user.avatarUrl || undefined}
            sx={{
              width: 32,
              height: 32,
              border: `2px solid ${theme.palette.primary._alpha.main_40}`,
              bgcolor: theme.palette.primary._alpha.main_10,
              color: theme.palette.primary.main,
              fontWeight: 800,
              fontSize: "0.75rem",
            }}
          >
            {user.name?.[0]}
            {user.surname?.[0]}
          </Avatar>
          <Stack spacing={-0.5} sx={{ display: { xs: "none", sm: "flex" } }}>
            <Typography
              variant="body2"
              fontWeight={800}
              color="text.primary"
              sx={{ fontSize: "0.85rem" }}
            >
              {user.name} {user.surname}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                fontSize: "0.65rem",
                opacity: 0.7,
              }}
            >
              {(dict["roles-header"] as Record<string, string>)?.[
                user.roleName || ""
              ] ?? user.roleName}
            </Typography>
          </Stack>
        </Box>
      </Stack>

      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleMenuClose}
        PaperProps={{ elevation: 0, sx: menuPaperSx }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem onClick={handleOpenProfile} sx={{ gap: 1.5 }}>
          <ListItemIcon sx={{ minWidth: "auto !important" }}>
            <PersonIcon
              fontSize="small"
              sx={{ color: theme.palette.primary.main }}
            />
          </ListItemIcon>
          {dict?.common?.profile || "Profile"}
        </MenuItem>
        <MenuItem onClick={handleOpenSettings} sx={{ gap: 1.5 }}>
          <ListItemIcon sx={{ minWidth: "auto !important" }}>
            <SettingsIcon
              fontSize="small"
              sx={{ color: theme.palette.primary.main }}
            />
          </ListItemIcon>
          {dict.common.settings}
        </MenuItem>
        <Divider
          sx={{
            borderColor: theme.palette.divider,
            my: 0.5,
          }}
        />
        <MenuItem
          onClick={() => {
            handleMenuClose();
            setLogoutDialogOpen(true);
          }}
          sx={{ color: "#f43f5e !important", gap: 1.5 }}
        >
          <ListItemIcon sx={{ minWidth: "auto !important" }}>
            <LogoutIcon fontSize="small" sx={{ color: "inherit" }} />
          </ListItemIcon>
          {dict.common.logout}
        </MenuItem>
      </Menu>

      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <LogoutConfirmationDialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
