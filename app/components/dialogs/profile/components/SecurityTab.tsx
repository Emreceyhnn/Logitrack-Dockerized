import { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Button,
  TextField,
  CircularProgress,
  InputAdornment,
  useTheme,
} from "@mui/material";
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
} from "@mui/icons-material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  ProfilePageState,
  ProfilePageActions,
} from "@/app/lib/type/profile";

interface SecurityTabProps {
  state: ProfilePageState;
  actions: ProfilePageActions;
}

export default function SecurityTab({ state, actions }: SecurityTabProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const [show, setShow] = useState({
    current: false,
    newP: false,
    confirm: false,
  });

  const passwordMatch =
    state.passwordForm.newPassword === state.passwordForm.confirmPassword;
  const len = state.passwordForm.newPassword.length;
  const strength =
    len >= 12 ? "strong" : len >= 8 ? "medium" : len > 0 ? "weak" : "none";

  const strengthMap = {
    none: {
      color: theme.palette.common.white_alpha.main_10,
      alphaBlock: theme.palette.common.white_alpha,
      width: "0%",
      label: "",
    },
    weak: {
      color: theme.palette.error.main,
      alphaBlock: theme.palette.error._alpha,
      width: "33%",
      label: dict.profile.security.strengths.vulnerable,
    },
    medium: {
      color: theme.palette.warning.main,
      alphaBlock: theme.palette.warning._alpha,
      width: "66%",
      label: dict.profile.security.strengths.acceptable,
    },
    strong: {
      color: theme.palette.success.main,
      alphaBlock: theme.palette.success._alpha,
      width: "100%",
      label: dict.profile.security.strengths.robust,
    },
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
    "& .MuiFormHelperText-root.Mui-error": {
      color: theme.palette.error.main,
      fontWeight: 600,
    },
  };

  return (
    <Stack spacing={3.5}>
      {/* Information Banner */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: 3,
          bgcolor: theme.palette.primary._alpha.main_06,
          border: `1px solid ${theme.palette.primary._alpha.main_15}`,
          display: "flex",
          gap: 2,
          alignItems: "flex-start",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: theme.palette.primary._alpha.main_10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mt: 0.5,
          }}
        >
          <SecurityIcon
            sx={{ color: theme.palette.primary.main, fontSize: 18 }}
          />
        </Box>
        <Box>
          <Typography
            variant="body2"
            fontWeight={800}
            sx={{ color: theme.palette.primary.main, mb: 0.5 }}
          >
            {dict.profile.security.bannerTitle}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.common.white_alpha.main_45,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {dict.profile.security.bannerDesc}
          </Typography>
        </Box>
      </Box>

      <Stack spacing={2.5}>
        <TextField
          label={dict.profile.security.currentPassword}
          fullWidth
          type={show.current ? "text" : "password"}
          value={state.passwordForm.currentPassword}
          onChange={(e) =>
            actions.updatePasswordForm({ currentPassword: e.target.value })
          }
          sx={fieldSx}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() =>
                    setShow((s) => ({ ...s, current: !s.current }))
                  }
                >
                  {show.current ? (
                    <VisibilityOff
                      sx={{
                        fontSize: 18,
                        color: theme.palette.common.white_alpha.main_30,
                      }}
                    />
                  ) : (
                    <Visibility
                      sx={{
                        fontSize: 18,
                        color: theme.palette.common.white_alpha.main_30,
                      }}
                    />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Box>
          <TextField
            label={dict.profile.security.newPassword}
            fullWidth
            type={show.newP ? "text" : "password"}
            value={state.passwordForm.newPassword}
            onChange={(e) =>
              actions.updatePasswordForm({ newPassword: e.target.value })
            }
            sx={fieldSx}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShow((s) => ({ ...s, newP: !s.newP }))}
                  >
                    {show.newP ? (
                      <VisibilityOff
                        sx={{
                          fontSize: 18,
                          color: theme.palette.common.white_alpha.main_30,
                        }}
                      />
                    ) : (
                      <Visibility
                        sx={{
                          fontSize: 18,
                          color: theme.palette.common.white_alpha.main_30,
                        }}
                      />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {len > 0 && (
            <Box mt={1.5}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.common.white_alpha.main_45,
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                  }}
                >
                  {dict.profile.security.entropyLevel}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      strengthMap[strength as keyof typeof strengthMap].color,
                    fontWeight: 800,
                    fontSize: "0.65rem",
                  }}
                >
                  {strengthMap[strength as keyof typeof strengthMap].label}
                </Typography>
              </Stack>
              <Box
                sx={{
                  height: 4,
                  bgcolor: theme.palette.common.white_alpha.main_05,
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width:
                      strengthMap[strength as keyof typeof strengthMap].width,
                    bgcolor:
                      strengthMap[strength as keyof typeof strengthMap].color,
                    borderRadius: 2,
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: `0 0 8px ${strengthMap[strength as keyof typeof strengthMap].alphaBlock?.main_40 || "transparent"}`,
                  }}
                />
              </Box>
            </Box>
          )}
        </Box>

        <TextField
          label={dict.profile.security.confirmPassword}
          fullWidth
          type={show.confirm ? "text" : "password"}
          value={state.passwordForm.confirmPassword}
          onChange={(e) =>
            actions.updatePasswordForm({ confirmPassword: e.target.value })
          }
          error={
            state.passwordForm.confirmPassword.length > 0 && !passwordMatch
          }
          helperText={
            state.passwordForm.confirmPassword.length > 0 && !passwordMatch
              ? dict.profile.security.matchError
              : ""
          }
          sx={fieldSx}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() =>
                    setShow((s) => ({ ...s, confirm: !s.confirm }))
                  }
                >
                  {show.confirm ? (
                    <VisibilityOff
                      sx={{
                        fontSize: 18,
                        color: theme.palette.common.white_alpha.main_30,
                      }}
                    />
                  ) : (
                    <Visibility
                      sx={{
                        fontSize: 18,
                        color: theme.palette.common.white_alpha.main_30,
                      }}
                    />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Box display="flex" justifyContent="flex-end" pt={1}>
        <Button
          variant="contained"
          onClick={actions.changePassword}
          disabled={
            state.isSaving ||
            !state.passwordForm.currentPassword ||
            !passwordMatch ||
            !state.passwordForm.newPassword ||
            strength === "weak"
          }
          startIcon={
            state.isSaving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <LockIcon sx={{ fontSize: 18 }} />
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
            "&.Mui-disabled": {
              bgcolor: theme.palette.common.white_alpha.main_05,
              color: theme.palette.common.white_alpha.main_20,
              border: `1px solid ${theme.palette.common.white_alpha.main_05}`,
            },
          }}
        >
          {state.isSaving
            ? dict.profile.status.upgrading
            : dict.profile.security.updateButton}
        </Button>
      </Box>
    </Stack>
  );
}
