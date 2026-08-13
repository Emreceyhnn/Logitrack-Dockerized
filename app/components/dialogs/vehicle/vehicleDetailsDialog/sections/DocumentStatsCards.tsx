"use client";

import { Box, Stack, Typography, Button, Divider, useTheme } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import QueryBuilderIcon from "@mui/icons-material/QueryBuilder";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { formatDisplayDate, DateSettings } from "@/app/lib/utils/date";

import { Dictionary } from "@/app/lib/language/language";

interface DocumentStatsCardsProps {
  dict: Dictionary;
  dateSettings: DateSettings;
  validCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  noExpiryCount: number;
  totalCount: number;
  lastUploadDate: Date;
  onUploadClick: () => void;
}

/**
 * tr-Araç belgelerinin durum özeti ve yükleme aksiyonu.
 * en-Status summary for a vehicle's documents, plus the upload action.
 *
 *    Laid out as one panel of rows rather than four equal tiles. The counts are
 *    mutually exclusive states of the same set, so they belong on a shared
 *    scale where they can be compared at a glance — four separate cards gave
 *    equal visual weight to "valid" and "expired" and made the group read as
 *    unrelated metrics. "Last upload" is a timestamp, not a count, so it sits
 *    in the footer instead of masquerading as a fifth KPI.
 * input (DocumentStatsCardsProps)
 * output (JSX.Element)
 */
export default function DocumentStatsCards({
  dict,
  dateSettings,
  validCount,
  expiringSoonCount,
  expiredCount,
  noExpiryCount,
  totalCount,
  lastUploadDate,
  onUploadClick,
}: DocumentStatsCardsProps) {
  const theme = useTheme();
  const t = dict.vehicles.docStats;

  const rows = [
    {
      key: "expired",
      label: t.expired,
      count: expiredCount,
      color: theme.palette.error.main,
      icon: <ErrorOutlineIcon sx={{ fontSize: 16 }} />,
    },
    {
      key: "expiringSoon",
      label: t.expiringSoon,
      count: expiringSoonCount,
      color: theme.palette.warning.main,
      icon: <QueryBuilderIcon sx={{ fontSize: 16 }} />,
    },
    {
      key: "valid",
      label: t.valid,
      count: validCount,
      color: theme.palette.success.main,
      icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
    },
    {
      key: "noExpiry",
      label: t.noExpiry,
      count: noExpiryCount,
      color: theme.palette.text.disabled,
      icon: <HelpOutlineIcon sx={{ fontSize: 16 }} />,
    },
  ];

  // A state with nothing in it is noise. Keep the two that always carry meaning
  // (expired / valid) so the panel never collapses to a single line.
  const visibleRows = rows.filter(
    (r) => r.count > 0 || r.key === "expired" || r.key === "valid"
  );

  const hasUpload = lastUploadDate.getTime() > 0;

  return (
    <Stack
      spacing={0}
      sx={{
        width: 260,
        flexShrink: 0,
        borderRadius: "12px",
        border: `1px solid ${theme.palette.divider}`,
        bgcolor:
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.02)"
            : "rgba(0,0,0,0.015)",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        sx={{ px: 2, pt: 1.75, pb: 1.25 }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
          {t.summary}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
          {t.totalDocs.replace("{count}", String(totalCount))}
        </Typography>
      </Stack>

      <Divider />

      <Stack sx={{ px: 1, py: 0.5 }}>
        {visibleRows.map((row) => {
          // Zero is stated plainly rather than highlighted — "0 expired" is
          // good news and must not compete with a real count.
          const isZero = row.count === 0;
          return (
            <Stack
              key={row.key}
              direction="row"
              alignItems="center"
              spacing={1.25}
              sx={{ px: 1, py: 0.875, borderRadius: "8px" }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isZero ? theme.palette.text.disabled : row.color,
                }}
              >
                {row.icon}
              </Box>
              <Typography
                sx={{
                  fontSize: 12.5,
                  color: "text.secondary",
                  flexGrow: 1,
                  minWidth: 0,
                }}
              >
                {row.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: 15,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  color: isZero ? theme.palette.text.disabled : row.color,
                }}
              >
                {row.count}
              </Typography>
            </Stack>
          );
        })}
      </Stack>

      <Divider />

      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{ px: 2, py: 1.25 }}
      >
        <ScheduleIcon sx={{ fontSize: 14, color: "text.disabled" }} />
        <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
          {hasUpload
            ? `${t.lastUpload}: ${formatDisplayDate(
                lastUploadDate.toISOString(),
                dateSettings
              )}`
            : t.never}
        </Typography>
      </Stack>

      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <Button
          fullWidth
          variant="contained"
          disableElevation
          sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600 }}
          onClick={onUploadClick}
          startIcon={<FileUploadIcon sx={{ fontSize: 18 }} />}
        >
          {t.uploadNew}
        </Button>
      </Box>
    </Stack>
  );
}
