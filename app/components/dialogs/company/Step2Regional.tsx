import {
  Box,
  Stack,
  Typography,
  MenuItem,
  Select,
  FormControl,
  FormControlLabel,
  Checkbox,
  Grid,
} from "@mui/material";
import { CompanyStepProps } from "@/app/lib/type/create-company";
import PublicIcon from "@mui/icons-material/Public";
import PaymentsIcon from "@mui/icons-material/Payments";
import LanguageIcon from "@mui/icons-material/Language";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useFormikContext } from "formik";
import { CompanyFormData } from "@/app/lib/type/create-company";
import { COMMON_TIMEZONES } from "@/app/lib/constants";

export default function Step2Regional({ state, actions }: CompanyStepProps) {
  const dict = useDictionary();
  const { formData } = state;
  const { errors, touched, handleBlur } = useFormikContext<CompanyFormData>();

  return (
    <Box>
      {/* Title/subtitle live in the dialog header; only the section eyebrow is
          kept here to anchor the step. */}
      <Typography
        variant="overline"
        sx={{
          display: "block",
          mb: 2,
          color: "primary.main",
          fontWeight: 800,
          letterSpacing: "0.1em",
        }}
      >
        {dict.company.dialogs.steps.globalConfig}
      </Typography>

      <Stack spacing={2.5}>
        <Box>
          <Typography
            variant="subtitle2"
            sx={{
              mb: 1,
              fontWeight: 700,
              color: (theme) => theme.palette.text.primary_alpha.main_70,
            }}
          >
            {dict.company.dialogs.steps.timezone}
          </Typography>
          <FormControl fullWidth error={touched.timezone && !!errors.timezone}>
            <Select
              name="timezone"
              value={formData.timezone}
              onChange={(e) =>
                actions.updateFormData({ timezone: e.target.value as string })
              }
              onBlur={handleBlur}
              startAdornment={
                <PublicIcon
                  sx={{
                    mr: 1,
                    color: (theme) => theme.palette.text.primary_alpha.main_30,
                    fontSize: 20,
                  }}
                />
              }
              sx={{
                bgcolor: (theme) =>
                  theme.palette.background.paper_alpha.main_50,
                borderRadius: 3,
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: (theme) => theme.palette.divider_alpha.main_10,
                },
              }}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <MenuItem key={tz.value} value={tz.value}>
                  {tz.label}
                </MenuItem>
              ))}
            </Select>
            {touched.timezone && errors.timezone && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 0.5, ml: 1.5 }}
              >
                {errors.timezone}
              </Typography>
            )}
          </FormControl>
        </Box>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1,
                fontWeight: 700,
                color: (theme) => theme.palette.text.primary_alpha.main_70,
              }}
            >
              {dict.company.dialogs.steps.currency}
            </Typography>
            <FormControl
              fullWidth
              error={touched.currency && !!errors.currency}
            >
              <Select
                name="currency"
                value={formData.currency}
                onChange={(e) =>
                  actions.updateFormData({ currency: e.target.value as string })
                }
                onBlur={handleBlur}
                startAdornment={
                  <PaymentsIcon
                    sx={{
                      mr: 1,
                      color: (theme) =>
                        theme.palette.text.primary_alpha.main_30,
                      fontSize: 20,
                    }}
                  />
                }
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.background.paper_alpha.main_50,
                  borderRadius: 3,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: (theme) => theme.palette.divider_alpha.main_10,
                  },
                }}
              >
                <MenuItem value="TRY">₺ TRY — {dict.currencies.TRY}</MenuItem>
                <MenuItem value="USD">$ USD — {dict.currencies.USD}</MenuItem>
                <MenuItem value="EUR">€ EUR — {dict.currencies.EUR}</MenuItem>
                <MenuItem value="GBP">£ GBP — {dict.currencies.GBP}</MenuItem>
              </Select>
              {touched.currency && errors.currency && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 0.5, ml: 1.5 }}
                >
                  {errors.currency}
                </Typography>
              )}
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1,
                fontWeight: 700,
                color: (theme) => theme.palette.text.primary_alpha.main_70,
              }}
            >
              {dict.company.dialogs.steps.language}
            </Typography>
            <FormControl
              fullWidth
              error={touched.language && !!errors.language}
            >
              <Select
                name="language"
                value={formData.language}
                onChange={(e) =>
                  actions.updateFormData({ language: e.target.value as string })
                }
                onBlur={handleBlur}
                startAdornment={
                  <LanguageIcon
                    sx={{
                      mr: 1,
                      color: (theme) =>
                        theme.palette.text.primary_alpha.main_30,
                      fontSize: 20,
                    }}
                  />
                }
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.background.paper_alpha.main_50,
                  borderRadius: 3,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: (theme) => theme.palette.divider_alpha.main_10,
                  },
                }}
              >
                <MenuItem value="en">{dict.languages.en}</MenuItem>
                <MenuItem value="tr">{dict.languages.tr}</MenuItem>
              </Select>
              {touched.language && errors.language && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 0.5, ml: 1.5 }}
                >
                  {errors.language}
                </Typography>
              )}
            </FormControl>
          </Grid>
        </Grid>

        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: (theme) => theme.palette.primary._alpha.main_04,
            border: (theme) =>
              `1px solid ${theme.palette.primary._alpha.main_15}`,
            display: "flex",
            gap: 2.5,
            transition: "0.2s",
            "&:hover": {
              bgcolor: (theme) => theme.palette.primary._alpha.main_06,
            },
          }}
        >
          <InfoOutlinedIcon sx={{ color: "primary.main", mt: 0.5 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
              {dict.company.dialogs.steps.integrity}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: (theme) => theme.palette.text.secondary_alpha.main_70,
                display: "block",
                mb: 1,
                lineHeight: 1.5,
              }}
            >
              {dict.company.dialogs.steps.standardize}
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.regionalVisibility}
                  onChange={(e) =>
                    actions.updateFormData({
                      regionalVisibility: e.target.checked,
                    })
                  }
                  sx={{
                    color: (theme) => theme.palette.primary._alpha.main_50,
                    "&.Mui-checked": { color: "primary.main" },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {dict.company.dialogs.steps.overrides}
                </Typography>
              }
            />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
