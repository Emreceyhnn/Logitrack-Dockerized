"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { Mail, TriangleAlert } from "lucide-react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  EmailTemplateKey,
  EmailTestResult,
  EmailTesterActions,
  EmailTesterState,
  SandboxPageProps,
} from "@/app/lib/type/admin/sandbox";

const TEMPLATES: EmailTemplateKey[] = [
  "verification",
  "passwordReset",
  "companyWelcome",
  "securityAlert",
  "notification",
  "custom",
];

/**
 * tr-E-posta test aracı sayfası.
 * en-Email tester. Sends a REAL message through Resend using the app's own
 *    templates, so the result reflects what production actually delivers.
 * input (SandboxPageProps)
 * output (JSX.Element)
 */
export default function EmailTesterPage({ title, subtitle }: SandboxPageProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const t = dict.admin.sandbox.email;

  const [state, setState] = useState<EmailTesterState>({
    to: "",
    template: "verification",
    lang: "en",
    subject: "",
    html: "",
    result: null,
    sending: false,
    error: null,
  });

  const setField = useCallback(
    <K extends keyof EmailTesterState>(key: K, value: EmailTesterState[K]) => {
      setState((s) => ({ ...s, [key]: value }));
    },
    []
  );

  const send = useCallback(async () => {
    setState((s) => ({ ...s, sending: true, error: null, result: null }));

    try {
      const res = await fetch("/api/admin/sandbox/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          to: state.to,
          template: state.template,
          lang: state.lang,
          ...(state.template === "custom"
            ? { subject: state.subject, html: state.html }
            : {}),
        }),
      });

      const json: unknown = await res.json();

      if (!res.ok) {
        setState((s) => ({
          ...s,
          sending: false,
          error:
            (json as { error?: string })?.error ??
            `Request failed (${res.status})`,
        }));
        return;
      }

      setState((s) => ({
        ...s,
        sending: false,
        result: json as EmailTestResult,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        sending: false,
        error: err instanceof Error ? err.message : dict.admin.common.error,
      }));
    }
  }, [
    state.to,
    state.template,
    state.lang,
    state.subject,
    state.html,
    dict.admin.common.error,
  ]);

  const actions = useMemo<EmailTesterActions>(
    () => ({ setField, send }),
    [setField, send]
  );

  const isCustom = state.template === "custom";
  const canSend = state.to.trim().length > 3 && !state.sending;

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>
          {subtitle}
        </Typography>
      </Box>

      {/* This tester has real-world side effects; say so plainly. */}
      <Alert
        severity="warning"
        icon={<TriangleAlert size={17} />}
        sx={{ mb: 2.5 }}
      >
        {t.warning}
      </Alert>

      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper_alpha.main_70,
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.75 }}>
              {t.recipient}
            </Typography>
            <TextField
              size="small"
              fullWidth
              type="email"
              value={state.to}
              onChange={(e) => actions.setField("to", e.target.value)}
              placeholder={t.recipientPlaceholder}
            />
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.75 }}>
                {t.template}
              </Typography>
              <Select
                size="small"
                fullWidth
                value={state.template}
                onChange={(e) =>
                  actions.setField(
                    "template",
                    e.target.value as EmailTemplateKey
                  )
                }
              >
                {TEMPLATES.map((key) => (
                  <MenuItem key={key} value={key} sx={{ fontSize: 13.5 }}>
                    {t.templates[key]}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Box sx={{ width: { xs: "100%", sm: 160 } }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.75 }}>
                {t.language}
              </Typography>
              <Select
                size="small"
                fullWidth
                value={state.lang}
                onChange={(e) =>
                  actions.setField("lang", e.target.value as "en" | "tr")
                }
              >
                <MenuItem value="en" sx={{ fontSize: 13.5 }}>
                  English
                </MenuItem>
                <MenuItem value="tr" sx={{ fontSize: 13.5 }}>
                  Türkçe
                </MenuItem>
              </Select>
            </Box>
          </Stack>

          {isCustom && (
            <>
              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.75 }}>
                  {t.subject}
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  value={state.subject}
                  onChange={(e) => actions.setField("subject", e.target.value)}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.75 }}>
                  {t.html}
                </Typography>
                <TextField
                  multiline
                  minRows={6}
                  fullWidth
                  value={state.html}
                  onChange={(e) => actions.setField("html", e.target.value)}
                  slotProps={{
                    htmlInput: {
                      style: {
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 12.5,
                      },
                    },
                  }}
                />
              </Box>
            </>
          )}

          <Box>
            <Button
              variant="contained"
              startIcon={<Mail size={15} />}
              onClick={() => void actions.send()}
              disabled={!canSend}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {state.sending ? t.sending : t.send}
            </Button>
          </Box>

          {state.error && <Alert severity="error">{state.error}</Alert>}

          {state.result && (
            <Alert severity={state.result.ok ? "success" : "error"}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {state.result.ok ? t.success : t.failure}
              </Typography>
              <Typography sx={{ fontSize: 12.5, mt: 0.25 }}>
                {state.result.message} · {state.result.durationMs} ms
              </Typography>
            </Alert>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
