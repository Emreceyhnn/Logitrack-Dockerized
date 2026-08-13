"use client";

import React from "react";
import {
  Box,
  Typography,
  Stack,
  Chip,
  useTheme,
} from "@mui/material";
import {
  LightMode,
  DarkMode,
  DesktopMac,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMode } from "@/app/lib/theme/themeContext";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type { SettingsPageState, SettingsPageActions, AppearanceMode } from "@/app/lib/type/settings";

interface AppearanceTabProps {
  state: SettingsPageState;
  actions: SettingsPageActions;
}

export default function AppearanceTab({ state, actions }: AppearanceTabProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const { setMode } = useThemeMode();

  const modes: { value: AppearanceMode; label: string; icon: React.ElementType; desc: string }[] = [
    { value: "light", label: dict.settings.dialogs.appearance.modes.polar, icon: LightMode, desc: dict.settings.dialogs.appearance.modes.polarDesc },
    { value: "dark", label: dict.settings.dialogs.appearance.modes.nebula, icon: DarkMode, desc: dict.settings.dialogs.appearance.modes.nebulaDesc },
    { value: "system", label: dict.settings.dialogs.appearance.modes.adaptive, icon: DesktopMac, desc: dict.settings.dialogs.appearance.modes.adaptiveDesc },
  ];

  const handleChange = (mode: AppearanceMode) => {
    actions.updateAppearance({ mode });
    setMode(mode); // setMode now handles "system" → resolves to OS preference
  };

  return (
    <Stack spacing={3.5}>
      <Box sx={{ 
        p: 2, 
        borderRadius: 2.5, 
        bgcolor: theme.palette.mode === "dark" ? theme.palette.primary._alpha.main_04 : theme.palette.primary._alpha.main_08,
        border: `1px solid ${theme.palette.primary._alpha.main_10}`
      }}>
        <Typography variant="caption" sx={{ color: theme.palette.mode === "dark" ? theme.palette.common.white_alpha.main_45 : "text.secondary", fontWeight: 600, lineHeight: 1.6 }}>
            {dict.settings.dialogs.appearance.desc}
        </Typography>
      </Box>

      <Stack direction="row" spacing={2}>
        {modes.map((m) => {
          const active = state.appearance.mode === m.value;
          const Icon = m.icon;
          return (
            <Box
              key={m.value}
              onClick={() => handleChange(m.value)}
              sx={{
                flex: 1,
                p: 2.5,
                borderRadius: 4,
                border: `1.5px solid ${active ? theme.palette.primary.main : (theme.palette.mode === "dark" ? theme.palette.common.white_alpha.main_05 : theme.palette.divider_alpha.main_20)}`,
                bgcolor: active ? theme.palette.primary._alpha.main_08 : (theme.palette.mode === "dark" ? theme.palette.common.white_alpha.main_02 : theme.palette.background.default_alpha.main_40),
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  border: `1.5px solid ${active ? theme.palette.primary._alpha.main_80 : theme.palette.primary._alpha.main_20}`,
                  bgcolor: active ? theme.palette.primary._alpha.main_10 : theme.palette.primary._alpha.main_04,
                  transform: "translateY(-4px)",
                  boxShadow: theme.palette.mode === "dark" 
                    ? `0 12px 32px ${theme.palette.common.black_alpha.main_50}`
                    : "0 12px 32px rgba(0,0,0,0.08)"
                },
                "&::after": active ? {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "40px",
                    height: "40px",
                    background: `linear-gradient(45deg, transparent 50%, ${theme.palette.primary._alpha.main_10} 50%)`,
                } : {}
              }}
            >
              <Box
                sx={{
                  width: 44, height: 44, borderRadius: 2.5, mb: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  bgcolor: active ? theme.palette.primary.main : (theme.palette.mode === "dark" ? theme.palette.common.white_alpha.main_05 : theme.palette.divider_alpha.main_20),
                  color: active ? (theme.palette.mode === "dark" ? "#000" : "#FFF") : (theme.palette.mode === "dark" ? theme.palette.common.white_alpha.main_40 : theme.palette.text.secondary),
                  transition: "all 0.3s",
                  boxShadow: active ? `0 8px 20px ${theme.palette.primary._alpha.main_40}` : "none"
                }}
              >
                <Icon sx={{ fontSize: 22 }} />
              </Box>
              <Typography variant="body1" fontWeight={800} color="text.primary" sx={{ mb: 0.5 }}>
                  {m.label}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mb: 2 }}>
                  {m.desc}
              </Typography>
              
              <AnimatePresence>
                {active && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Chip
                            label={dict.settings.dialogs.appearance.modes.projectionActive} size="small"
                            icon={<CheckIcon sx={{ fontSize: 13, color: "inherit !important" }} />}
                            sx={{
                                bgcolor: theme.palette.primary._alpha.main_15,
                                color: theme.palette.primary.main,
                                fontWeight: 850,
                                fontSize: "0.6rem",
                                height: 22,
                                border: `1px solid ${theme.palette.primary._alpha.main_30}`,
                                "& .MuiChip-icon": { ml: 0.5 }
                            }}
                        />
                    </motion.div>
                )}
              </AnimatePresence>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}
