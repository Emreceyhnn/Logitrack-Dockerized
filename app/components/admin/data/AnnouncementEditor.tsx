"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { Megaphone, Send, X } from "lucide-react";
import { useLanguage } from "@/app/lib/language/DictionaryContext";

type Severity = "info" | "warning" | "critical";

interface Announcement {
  active: boolean;
  message: string;
  severity: Severity;
  updatedAt: string | null;
  updatedBy: string | null;
}

const MAX_LENGTH = 280;

/**
 * tr-Duyuru bandı editörü.
 * en-Announcement banner editor.
 *
 *    The preview renders the message with plain React interpolation, never
 *    dangerouslySetInnerHTML — this banner reaches every signed-in user, so
 *    interpreting markup here would turn an admin text field into
 *    platform-wide stored XSS.
 * input ()
 * output (JSX.Element)
 */
export default function AnnouncementEditor() {
  const theme = useTheme();
  const { dict, lang } = useLanguage();
  const t = dict.admin.data.announcement;

  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Severity>("info");
  const [current, setCurrent] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcement", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { announcement: Announcement };
      setCurrent(data.announcement);
      setMessage(data.announcement.message);
      setSeverity(data.announcement.severity);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.admin.common.error);
    } finally {
      setLoading(false);
    }
  }, [dict.admin.common.error]);

  const save = useCallback(
    async (active: boolean) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/announcement", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ active, message, severity }),
        });
        const json: unknown = await res.json();
        if (!res.ok) {
          throw new Error(
            (json as { error?: string })?.error ?? `Failed (${res.status})`
          );
        }
        const { announcement } = json as { announcement: Announcement };
        setCurrent(announcement);
        if (!active) setMessage("");
      } catch (err) {
        setError(err instanceof Error ? err.message : dict.admin.common.error);
      } finally {
        setSaving(false);
      }
    },
    [message, severity, dict.admin.common.error]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const severityColor: Record<Severity, string> = {
    info: theme.palette.kpi.sky,
    warning: theme.palette.kpi.amber,
    critical: theme.palette.kpi.error,
  };

  const tooLong = message.length > MAX_LENGTH;
  const canPublish = message.trim().length > 0 && !tooLong && !saving;

  return (
    <Box sx={{ mb: 4 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
          {t.title}
        </Typography>
        <Chip
          size="small"
          label={current?.active ? t.active : t.inactive}
          sx={{
            height: 20,
            fontSize: 10,
            fontWeight: 700,
            color: current?.active
              ? theme.palette.kpi.emerald
              : theme.palette.text.secondary,
            backgroundColor: current?.active
              ? alpha(theme.palette.kpi.emerald, 0.12)
              : alpha(theme.palette.text.secondary, 0.1),
          }}
        />
      </Stack>

      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper_alpha.main_70,
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.75 }}>
              {t.message}
            </Typography>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.messagePlaceholder}
              disabled={loading}
              error={tooLong}
            />
            <Typography
              sx={{
                fontSize: 11,
                mt: 0.5,
                color: tooLong
                  ? theme.palette.error.main
                  : theme.palette.text.secondary,
              }}
            >
              {message.length} / {MAX_LENGTH} {t.charCount}
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} alignItems="flex-end">
            <Box sx={{ width: 180 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.75 }}>
                {t.severity}
              </Typography>
              <Select
                size="small"
                fullWidth
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                disabled={loading}
              >
                {(["info", "warning", "critical"] as Severity[]).map((key) => (
                  <MenuItem key={key} value={key} sx={{ fontSize: 13.5 }}>
                    {t.severities[key]}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                size="small"
                startIcon={<Send size={14} />}
                disabled={!canPublish}
                onClick={() => void save(true)}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {t.publish}
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<X size={14} />}
                disabled={!current?.active || saving}
                onClick={() => void save(false)}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {t.clear}
              </Button>
            </Stack>
          </Stack>

          {/* Preview — plain text interpolation only. */}
          {message.trim() && (
            <Box>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  color: theme.palette.text.secondary,
                  mb: 0.75,
                }}
              >
                {t.preview}
              </Typography>
              <Stack
                direction="row"
                spacing={1.25}
                alignItems="center"
                sx={{
                  px: 2,
                  py: 1.25,
                  borderRadius: 2,
                  color: severityColor[severity],
                  backgroundColor: alpha(severityColor[severity], 0.1),
                  border: `1px solid ${alpha(severityColor[severity], 0.25)}`,
                }}
              >
                <Megaphone size={15} style={{ flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                  {message}
                </Typography>
              </Stack>
            </Box>
          )}

          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            flexWrap="wrap"
          >
            <Typography
              sx={{ fontSize: 11.5, color: theme.palette.text.secondary }}
            >
              {t.plainTextNotice}
            </Typography>
            {current?.updatedAt && (
              <Typography
                sx={{ fontSize: 11.5, color: theme.palette.text.secondary }}
              >
                · {t.updated}:{" "}
                {new Date(current.updatedAt).toLocaleString(lang, {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
