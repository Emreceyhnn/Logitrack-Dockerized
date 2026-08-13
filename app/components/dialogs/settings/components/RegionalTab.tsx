"use client";

import {
  Box,
  Typography,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  useTheme,
  Grid,
} from "@mui/material";
import {
  Language as LanguageIcon,
  Payments as PaymentsIcon,
  Save as SaveIcon,
  ScheduleOutlined as TimezoneIcon,
  CalendarTodayOutlined as DateFormatIcon,
  AccessTimeOutlined as TimeFormatIcon,
} from "@mui/icons-material";

import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  SettingsPageState,
  SettingsPageActions,
} from "@/app/lib/type/settings";
import { selectSxFactory, inputLabelSxFactory } from "./SettingsStyles";
import { COMMON_TIMEZONES } from "@/app/lib/constants";

interface RegionalTabProps {
  state: SettingsPageState;
  actions: SettingsPageActions;
}

export default function RegionalTab({ state, actions }: RegionalTabProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const ssX = selectSxFactory(theme);
  const ilSX = inputLabelSxFactory(theme);

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          p: 2,
          borderRadius: 2.5,
          bgcolor: theme.palette.primary._alpha.main_04,
          border: `1px solid ${theme.palette.primary._alpha.main_10}`,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.common.white_alpha.main_45,
            fontWeight: 550,
            lineHeight: 1.6,
          }}
        >
          {dict.company.dialogs.localizationDesc}
        </Typography>
      </Box>

      {/* Group 1: Localization & Currency */}
      <Box>
        <Stack direction="row" alignItems="center" gap={1} mb={2}>
          <Box
            sx={{
              p: 0.8,
              borderRadius: 1.5,
              bgcolor: theme.palette.primary._alpha.main_10,
            }}
          >
            <LanguageIcon sx={{ fontSize: 16, color: "primary.main" }} />
          </Box>
          <Typography
            variant="caption"
            fontWeight={850}
            sx={{
              color: theme.palette.common.white_alpha.main_60,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            {dict.settings.dialogs.tabs.localization}
          </Typography>
        </Stack>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" sx={ilSX}>
              <InputLabel>{dict.company.dialogs.interfaceLanguage}</InputLabel>
              <Select
                value={state.regional.language}
                label={dict.company.dialogs.interfaceLanguage}
                onChange={(e) =>
                  actions.updateRegional({
                    language: e.target.value as "en" | "tr",
                  })
                }
                startAdornment={
                  <LanguageIcon
                    sx={{
                      mr: 1,
                      fontSize: 18,
                      color: theme.palette.primary._alpha.main_50,
                    }}
                  />
                }
                sx={ssX}
              >
                <MenuItem value="en">🇺🇸 {dict.languages.en}</MenuItem>
                <MenuItem value="tr">🇹🇷 {dict.languages.tr}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" sx={ilSX}>
              <InputLabel>{dict.company.dialogs.defaultCurrency}</InputLabel>
              <Select
                value={state.regional.currency}
                label={dict.company.dialogs.defaultCurrency}
                onChange={(e) =>
                  actions.updateRegional({
                    currency: e.target.value as "USD" | "EUR" | "TRY" | "GBP",
                  })
                }
                startAdornment={
                  <PaymentsIcon
                    sx={{
                      mr: 1,
                      fontSize: 18,
                      color: theme.palette.primary._alpha.main_50,
                    }}
                  />
                }
                sx={ssX}
              >
                <MenuItem value="USD">
                  $ USD - {dict.settings.dialogs.regional.currencies.dollar}
                </MenuItem>
                <MenuItem value="EUR">
                  € EUR - {dict.settings.dialogs.regional.currencies.euro}
                </MenuItem>
                <MenuItem value="TRY">
                  ₺ TRY - {dict.settings.dialogs.regional.currencies.lira}
                </MenuItem>
                <MenuItem value="GBP">
                  £ GBP - {dict.settings.dialogs.regional.currencies.pound}
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Group 2: Time & Date Settings */}
      <Box>
        <Stack direction="row" alignItems="center" gap={1} mb={2}>
          <Box
            sx={{
              p: 0.8,
              borderRadius: 1.5,
              bgcolor: theme.palette.primary._alpha.main_10,
            }}
          >
            <TimezoneIcon sx={{ fontSize: 16, color: "primary.main" }} />
          </Box>
          <Typography
            variant="caption"
            fontWeight={850}
            sx={{
              color: theme.palette.common.white_alpha.main_60,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            {dict.company.dialogs.dateTimeFormat}
          </Typography>
        </Stack>

        <Grid container spacing={2.5}>
          {/* Active Timezone takes full width (12) because labels are very long */}
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth size="small" sx={ilSX}>
              <InputLabel>{dict.company.dialogs.activeTimezone}</InputLabel>
              <Select
                value={state.regional.timezone}
                label={dict.company.dialogs.activeTimezone}
                onChange={(e) =>
                  actions.updateRegional({ timezone: e.target.value })
                }
                startAdornment={
                  <TimezoneIcon
                    sx={{
                      mr: 1,
                      fontSize: 18,
                      color: theme.palette.primary._alpha.main_50,
                    }}
                  />
                }
                sx={ssX}
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <MenuItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Date Format */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" sx={ilSX}>
              <InputLabel>{dict.company.dialogs.dateTimeFormat}</InputLabel>
              <Select
                value={state.regional.dateFormat}
                label={dict.company.dialogs.dateTimeFormat}
                onChange={(e) =>
                  actions.updateRegional({ dateFormat: e.target.value })
                }
                startAdornment={
                  <DateFormatIcon
                    sx={{
                      mr: 1,
                      fontSize: 18,
                      color: theme.palette.primary._alpha.main_50,
                    }}
                  />
                }
                sx={ssX}
              >
                <MenuItem value="MM/DD/YYYY">
                  {dict.settings.dialogs.regional.dateFormats.standard}
                </MenuItem>
                <MenuItem value="DD/MM/YYYY">
                  {dict.settings.dialogs.regional.dateFormats.international}
                </MenuItem>
                <MenuItem value="DD.MM.YYYY">DD.MM.YYYY</MenuItem>
                <MenuItem value="YYYY-MM-DD">ISO-8601 (YYYY-MM-DD)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Time Format */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small" sx={ilSX}>
              <InputLabel>{dict.settings.dialogs.regional.timeFormat}</InputLabel>
              <Select
                value={state.regional.timeFormat}
                label={dict.settings.dialogs.regional.timeFormat}
                onChange={(e) =>
                  actions.updateRegional({ timeFormat: e.target.value })
                }
                startAdornment={
                  <TimeFormatIcon
                    sx={{
                      mr: 1,
                      fontSize: 18,
                      color: theme.palette.primary._alpha.main_50,
                    }}
                  />
                }
                sx={ssX}
              >
                <MenuItem value="24h">
                  24 {dict.settings.dialogs.regional.timeFormats.hour}
                </MenuItem>
                <MenuItem value="12h">
                  12 {dict.settings.dialogs.regional.timeFormats.hour} (AM/PM)
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Action Button */}
      <Box display="flex" justifyContent="flex-end" pt={1}>
        <Button
          variant="contained"
          startIcon={
            state.isSaving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SaveIcon sx={{ fontSize: 18 }} />
            )
          }
          onClick={actions.saveRegional}
          disabled={state.isSaving}
          sx={{
            textTransform: "none",
            fontWeight: 800,
            borderRadius: 2.5,
            px: 4,
            py: 1,
            boxShadow: `0 8px 32px ${theme.palette.primary._alpha.main_25}`,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            "&:hover": {
              boxShadow: `0 12px 40px ${theme.palette.primary._alpha.main_35}`,
              transform: "translateY(-1px)",
            },
            transition: "all 0.2s",
          }}
        >
          {state.isSaving
            ? dict.common.synchronizing
            : dict.common.updatePreferences}
        </Button>
      </Box>
    </Stack>
  );
}
