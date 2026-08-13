import React, { useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Avatar,
  Button,
  TextField,
  CircularProgress,
  Chip,
  InputAdornment,
  useTheme,
} from "@mui/material";
import {
  CameraAlt as CameraIcon,
  EmailOutlined as EmailIcon,
  Save as SaveIcon,
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  ProfilePageState,
  ProfilePageActions,
} from "@/app/lib/type/profile";

interface ProfileTabProps {
  state: ProfilePageState;
  actions: ProfilePageActions;
}

export default function ProfileTab({ state, actions }: ProfileTabProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () =>
      actions.updateProfileForm({ avatarUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      height: "42px",
      borderRadius: "10px",
      bgcolor:
        theme.palette.mode === "dark"
          ? "rgba(255, 255, 255, 0.03)"
          : "rgba(0, 0, 0, 0.02)",
      transition: "all 0.2s ease-in-out",
      "& fieldset": { borderColor: theme.palette.divider },
      "&:hover": {
        bgcolor:
          theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.04)",
        "& fieldset": { borderColor: theme.palette.text.secondary },
      },
      "&.Mui-focused": {
        bgcolor: "transparent",
        "& fieldset": {
          borderColor: theme.palette.primary.main,
          borderWidth: "2px",
        },
      },
    },
    "& .MuiInputLabel-root": {
      color: theme.palette.text.secondary,
      fontSize: "14px",
      fontWeight: 500,
    },
    "& .MuiInputLabel-root.Mui-focused": { color: theme.palette.primary.main },
  };

  return (
    <Stack spacing={3.5}>
      {/* Avatar Section */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          p: 3,
          borderRadius: 4,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: `radial-gradient(circle at top right, ${theme.palette.primary._alpha.main_08}, transparent)`,
            zIndex: 0,
          },
        }}
      >
        <Box sx={{ position: "relative", flexShrink: 0, zIndex: 1 }}>
          <Avatar
            src={state.profileForm.avatarUrl || undefined}
            sx={{
              width: 90,
              height: 90,
              border: `3px solid ${theme.palette.primary._alpha.main_30}`,
              bgcolor: theme.palette.primary._alpha.main_10,
              color: theme.palette.primary.main,
              fontSize: "2rem",
              fontWeight: 800,
              boxShadow: `0 8px 32px ${theme.palette.common.black_alpha.main_40}`,
            }}
          >
            {state.profileForm.name?.[0]}
            {state.profileForm.surname?.[0]}
          </Avatar>
          <IconButton
            onClick={() => fileRef.current?.click()}
            size="small"
            sx={{
              position: "absolute",
              bottom: 2,
              right: 2,
              bgcolor: theme.palette.primary.main,
              color: "#fff",
              width: 28,
              height: 28,
              border: `2px solid #0B1019`,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              "&:hover": {
                bgcolor: theme.palette.primary.dark,
                transform: "scale(1.1)",
              },
              transition: "all 0.2s",
            }}
          >
            <CameraIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarChange}
          />
        </Box>

        <Box sx={{ flex: 1, zIndex: 1 }}>
          <Typography
            component="div"
            fontWeight={800}
            color="text.primary"
            variant="h6"
            sx={{ letterSpacing: -0.5 }}
          >
            {state.profileForm.name} {state.profileForm.surname}
          </Typography>

          <Chip
            size="small"
            icon={
              <AdminIcon
                sx={{
                  fontSize: 13,
                  color: `${theme.palette.primary.main} !important`,
                }}
              />
            }
            label={dict.profile.account.verifiedMember}
            sx={{
              bgcolor: theme.palette.primary._alpha.main_12,
              color: theme.palette.primary.main,
              fontWeight: 700,
              fontSize: "0.7rem",
              height: 24,
              border: `1px solid ${theme.palette.primary._alpha.main_20}`,
            }}
          />
        </Box>
      </Box>

      {/* Form Fields */}
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2.5}>
          <TextField
            label={dict.profile.account.firstName}
            value={state.profileForm.name}
            onChange={(e) =>
              actions.updateProfileForm({ name: e.target.value })
            }
            error={!state.profileForm.name.trim()}
            fullWidth
            sx={fieldSx}
          />
          <TextField
            label={dict.profile.account.lastName}
            value={state.profileForm.surname}
            onChange={(e) =>
              actions.updateProfileForm({ surname: e.target.value })
            }
            error={!state.profileForm.surname.trim()}
            fullWidth
            sx={fieldSx}
          />
        </Stack>

        <TextField
          label={dict.profile.account.adminEmail}
          value={state.profileForm.email}
          disabled
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon
                  sx={{
                    fontSize: 18,
                    color: theme.palette.common.white_alpha.main_25,
                    ml: 0.5,
                  }}
                />
              </InputAdornment>
            ),
          }}
          helperText={dict.profile.account.emailHelper}
          sx={{
            ...fieldSx,
            "& .MuiOutlinedInput-root": {
              ...fieldSx["& .MuiOutlinedInput-root"],
              bgcolor: theme.palette.action.disabledBackground,
            },
            "& .MuiFormHelperText-root": {
              color: theme.palette.text.secondary,
              fontSize: "0.72rem",
              fontWeight: 500,
              mt: 1,
            },
            "& .Mui-disabled": {
              WebkitTextFillColor: theme.palette.text.disabled,
            },
          }}
        />
      </Stack>

      <Box display="flex" justifyContent="flex-end" pt={1}>
        <Button
          variant="contained"
          onClick={actions.saveProfile}
          disabled={
            state.isSaving ||
            !state.profileForm.name.trim() ||
            !state.profileForm.surname.trim()
          }
          startIcon={
            state.isSaving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SaveIcon sx={{ fontSize: 18 }} />
            )
          }
          sx={{
            textTransform: "none",
            fontWeight: 800,
            borderRadius: 2.5,
            px: 4,
            py: 1,
            fontSize: "0.9rem",
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            boxShadow: `0 8px 24px ${theme.palette.primary._alpha.main_30}`,
            "&:hover": {
              boxShadow: `0 12px 32px ${theme.palette.primary._alpha.main_40}`,
              transform: "translateY(-1px)",
            },
            transition: "all 0.2s",
          }}
        >
          {state.isSaving
            ? dict.profile.status.finalizing
            : dict.profile.account.syncButton}
        </Button>
      </Box>
    </Stack>
  );
}
