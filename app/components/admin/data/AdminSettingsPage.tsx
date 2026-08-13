"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { EyeOff } from "lucide-react";
import AnnouncementEditor from "./AnnouncementEditor";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import type { EnvEntry, FeatureFlag } from "@/app/lib/type/admin/data";

interface AdminSettingsPageProps {
  title: string;
  subtitle: string;
}

/**
 * tr-Özellik anahtarları ve ortam değişkenleri sayfası.
 * en-Feature flags (writable) and the environment viewer (read-only, masked).
 * input (AdminSettingsPageProps)
 * output (JSX.Element)
 */
export default function AdminSettingsPage({
  title,
  subtitle,
}: AdminSettingsPageProps) {
  const theme = useTheme();
  const { dict, lang } = useLanguage();
  const tFlags = dict.admin.data.flags;
  const tEnv = dict.admin.data.env;

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [env, setEnv] = useState<EnvEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as {
        flags: FeatureFlag[];
        env: EnvEntry[];
      };
      setFlags(data.flags);
      setEnv(data.env);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.admin.common.error);
    } finally {
      setLoading(false);
    }
  }, [dict.admin.common.error]);

  const toggleFlag = useCallback(
    async (key: string, enabled: boolean) => {
      setPendingKey(key);
      setError(null);

      // Optimistic: the switch should respond instantly, and the server
      // response replaces this value a moment later.
      setFlags((current) =>
        current.map((flag) => (flag.key === key ? { ...flag, enabled } : flag))
      );

      try {
        const res = await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ key, enabled }),
        });
        const json: unknown = await res.json();
        if (!res.ok) {
          throw new Error(
            (json as { error?: string })?.error ?? `Failed (${res.status})`
          );
        }
        const { flag } = json as { flag: FeatureFlag };
        setFlags((current) =>
          current.map((item) => (item.key === flag.key ? flag : item))
        );
      } catch (err) {
        // Roll the optimistic change back so the UI never claims a state the
        // server rejected.
        setFlags((current) =>
          current.map((flag) =>
            flag.key === key ? { ...flag, enabled: !enabled } : flag
          )
        );
        setError(err instanceof Error ? err.message : dict.admin.common.error);
      } finally {
        setPendingKey(null);
      }
    },
    [dict.admin.common.error]
  );

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const headSx = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
    color: theme.palette.text.secondary,
    borderBottomColor: theme.palette.divider,
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>
          {subtitle}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <AnnouncementEditor />

      {/* Feature flags */}
      <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.5 }}>
        {tFlags.title}
      </Typography>
      <TableContainer
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper_alpha.main_70,
          mb: 4,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>{tFlags.flag}</TableCell>
              <TableCell sx={headSx}>{tFlags.updated}</TableCell>
              <TableCell align="right" sx={headSx}>
                {tFlags.state}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {flags.map((flag) => (
              <TableRow key={flag.key}>
                <TableCell sx={{ borderBottomColor: theme.palette.divider }}>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    {flag.key}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      color: theme.palette.text.secondary,
                      mt: 0.25,
                    }}
                  >
                    {flag.description}
                  </Typography>
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: 12,
                    color: theme.palette.text.secondary,
                    borderBottomColor: theme.palette.divider,
                    whiteSpace: "nowrap",
                  }}
                >
                  {flag.updatedAt
                    ? new Date(flag.updatedAt).toLocaleString(lang, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : tFlags.never}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ borderBottomColor: theme.palette.divider }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="flex-end"
                  >
                    <Typography
                      sx={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: flag.enabled
                          ? theme.palette.kpi.emerald
                          : theme.palette.text.secondary,
                      }}
                    >
                      {flag.enabled ? tFlags.enabled : tFlags.disabled}
                    </Typography>
                    <Switch
                      size="small"
                      checked={flag.enabled}
                      disabled={loading || pendingKey === flag.key}
                      onChange={(e) =>
                        void toggleFlag(flag.key, e.target.checked)
                      }
                      inputProps={{ "aria-label": flag.key }}
                    />
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Environment */}
      <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1 }}>
        {tEnv.title}
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-start"
        sx={{
          px: 2,
          py: 1.25,
          mb: 2,
          borderRadius: 2,
          border: `1px dashed ${theme.palette.divider}`,
        }}
      >
        <EyeOff
          size={13}
          color={theme.palette.text.secondary}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
          {tEnv.maskNotice}
        </Typography>
      </Stack>

      <TableContainer
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper_alpha.main_70,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>{tEnv.variable}</TableCell>
              <TableCell sx={headSx}>{tEnv.value}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {env.map((entry) => (
              <TableRow key={entry.key}>
                <TableCell
                  sx={{
                    fontSize: 12,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    borderBottomColor: theme.palette.divider,
                  }}
                >
                  {entry.key}
                </TableCell>
                <TableCell sx={{ borderBottomColor: theme.palette.divider }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        color: entry.present
                          ? theme.palette.text.primary
                          : theme.palette.text.secondary,
                      }}
                    >
                      {entry.value}
                    </Typography>
                    {entry.masked && (
                      <Chip
                        size="small"
                        label={dict.admin.common.sensitive}
                        sx={{
                          height: 18,
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: theme.palette.kpi.amber,
                          backgroundColor: alpha(theme.palette.kpi.amber, 0.12),
                        }}
                      />
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
