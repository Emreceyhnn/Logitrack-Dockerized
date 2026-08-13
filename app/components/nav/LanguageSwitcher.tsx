"use client";

import React from "react";
import {
  Menu,
  MenuItem,
  ListItemText,
  Typography,
  useTheme,
  Box,
  Tooltip,
} from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import CheckIcon from "@mui/icons-material/Check";
import { useLanguage } from "@/app/lib/language/DictionaryContext";

const LanguageSwitcher = () => {
  /* --------------------------------- STATES --------------------------------- */
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  /* -------------------------------- VARIABLES ------------------------------- */
  const theme = useTheme();
  const { lang: currentLang, dict, changeLanguage } = useLanguage();

  const languages = [
    { code: "tr", label: dict.languages.tr, flag: "🇹🇷" },
    { code: "en", label: dict.languages.en, flag: "🇺🇸" },
  ];

  /* -------------------------------- HANDLERS -------------------------------- */
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (lang: string) => {
    if (lang === currentLang) return;

    // Instant switch — no full page navigation
    changeLanguage(lang);
    handleClose();
  };

  return (
    <>
      <Tooltip title={dict.common.tooltips.changeLanguage} arrow>
        <Box
          onClick={handleClick}
          sx={{
            display: "flex",
            alignItems: "center",
            height: 40,
            boxSizing: "border-box",
            gap: 1,
            px: 1.5,
            borderRadius: 2,
            cursor: "pointer",
            bgcolor: theme.palette.primary._alpha.main_05,
            border: `1px solid ${theme.palette.divider}`,
            transition: "all 0.2s ease",
            "&:hover": {
              bgcolor: theme.palette.primary._alpha.main_10,
              borderColor: theme.palette.primary._alpha.main_20,
            },
          }}
          aria-controls={open ? "language-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
        >
          <LanguageIcon
            fontSize="small"
            sx={{ color: theme.palette.text.secondary }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              textTransform: "uppercase",
              fontSize: "0.7rem",
            }}
          >
            {currentLang}
          </Typography>
        </Box>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        id="language-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: "visible",
            filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.12))",
            mt: 1.5,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider_alpha.main_10}`,
            borderRadius: 2,
            "& .MuiAvatar-root": {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            "&:before": {
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
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            selected={currentLang === lang.code}
            sx={{
              py: 1.5,
              px: 2.5,
              minWidth: 180,
              gap: 2,
              "&.Mui-selected": {
                bgcolor: theme.palette.primary._alpha.main_10,
                "&:hover": {
                  bgcolor: theme.palette.primary._alpha.main_15,
                },
              },
            }}
          >
            <Typography variant="body2" sx={{ fontSize: "1.2rem" }}>
              {lang.flag}
            </Typography>
            <ListItemText
              primary={lang.label}
              primaryTypographyProps={{
                variant: "body2",
                fontWeight: currentLang === lang.code ? 600 : 400,
              }}
            />
            {currentLang === lang.code && (
              <CheckIcon
                fontSize="small"
                sx={{ color: theme.palette.primary.main }}
              />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
