import {
  Stack,
  Typography,
  Button,
  Box,
  TextField,
  MenuItem,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

export default function AnalyticsHeader() {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "start", md: "center" }}
      spacing={2}
      sx={{ mb: 4 }}
    >
      <Box>
        <Typography
          variant="h4"
          component="h1"
          fontWeight={700}
          sx={{ color: "text.primary" }}
        >
          {dict.analytics.title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {dict.analytics.subtitle}
        </Typography>
      </Box>

      <Stack direction="row" spacing={2}>
        <TextField
          select
          defaultValue="30"
          size="small"
          sx={{ width: 170 }}
          slotProps={{
            input: {
              startAdornment: (
                <CalendarTodayIcon
                  fontSize="small"
                  sx={{ mr: 1, color: "text.secondary" }}
                />
              ),
            },
          }}
        >
          <MenuItem value="7">{dict.analytics.periods.last7Days}</MenuItem>
          <MenuItem value="30">{dict.analytics.periods.last30Days}</MenuItem>
          <MenuItem value="90">{dict.analytics.periods.lastQuarter}</MenuItem>
          <MenuItem value="365">{dict.analytics.periods.yearToDate}</MenuItem>
        </TextField>

        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {dict.analytics.exportReport}
        </Button>
      </Stack>
    </Stack>
  );
}
