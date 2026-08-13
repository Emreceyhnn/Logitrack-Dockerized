import { Box, Typography, Switch, Chip, Stack } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface NotifRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export default function NotificationRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: NotifRowProps) {
  const dict = useDictionary();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 2.5,
        py: 2,
        borderRadius: 3,
        border: (theme) =>
          `1px solid ${checked ? theme.palette.common.white_alpha.main_10 : theme.palette.common.white_alpha.main_05}`,
        bgcolor: (theme) =>
          checked
            ? theme.palette.primary._alpha.main_05
            : theme.palette.common.white_alpha.main_02,
        opacity: disabled ? 0.55 : 1,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          bgcolor: (theme) =>
            checked
              ? theme.palette.primary._alpha.main_08
              : theme.palette.common.white_alpha.main_03,
          borderColor: (theme) =>
            checked
              ? theme.palette.primary._alpha.main_30
              : theme.palette.primary._alpha.main_10,
        },
      }}
    >
      <Box>
        <Stack direction="row" alignItems="center" gap={1} mb={0.25}>
          <Typography variant="body2" fontWeight={750} color="white">
            {label}
          </Typography>
          {disabled && (
            <Chip
              label={dict.common.comingSoon}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.6rem",
                fontWeight: 800,
                bgcolor: (theme) => theme.palette.common.white_alpha.main_10,
                color: (theme) => theme.palette.common.white_alpha.main_60,
              }}
            />
          )}
        </Stack>
        <Typography
          variant="caption"
          sx={{
            color: (theme) => theme.palette.common.white_alpha.main_35,
            fontWeight: 500,
          }}
        >
          {description}
        </Typography>
      </Box>
      <Switch
        checked={disabled ? false : checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        size="small"
        sx={{
          "& .MuiSwitch-switchBase.Mui-checked": {
            color: "primary.main",
            "& + .MuiSwitch-track": {
              bgcolor: "primary.main",
              opacity: 0.3,
            },
          },
          "& .MuiSwitch-track": {
            bgcolor: (theme) => theme.palette.common.white_alpha.main_10,
          },
          "& .MuiSwitch-thumb": {
            boxShadow: (theme) =>
              checked
                ? `0 0 10px ${theme.palette.primary._alpha.main_60}`
                : "none",
          },
        }}
      />
    </Box>
  );
}
