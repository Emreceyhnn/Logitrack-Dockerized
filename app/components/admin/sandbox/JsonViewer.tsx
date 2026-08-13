"use client";

import { useMemo } from "react";
import { Box, useTheme } from "@mui/material";
import type { JsonViewerProps } from "@/app/lib/type/admin/sandbox";

/** One highlighted token. */
interface Token {
  text: string;
  kind: "key" | "string" | "number" | "boolean" | "null" | "plain";
}

// Ordered alternation: keys ("foo":) must be matched before generic strings,
// otherwise a key would be classified as a string value.
const TOKEN_PATTERN =
  /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\b(null)\b/g;

/**
 * tr-JSON metnini vurgulama için token'lara ayırır.
 * en-Splits JSON text into highlight tokens.
 *    Regex-based rather than AST-based on purpose: the input may be truncated
 *    or malformed (it is whatever the endpoint returned), so it must degrade
 *    to plain text instead of throwing.
 * input (value: string)
 * output (Token[])
 */
function tokenize(value: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ text: value.slice(lastIndex, index), kind: "plain" });
    }

    const [full, key, str, num, bool, nul] = match;
    if (key !== undefined) {
      // `full` includes the colon and any spacing; emit them separately so the
      // punctuation keeps the plain colour.
      tokens.push({ text: key, kind: "key" });
      tokens.push({ text: full.slice(key.length), kind: "plain" });
    } else if (str !== undefined) {
      tokens.push({ text: str, kind: "string" });
    } else if (num !== undefined) {
      tokens.push({ text: num, kind: "number" });
    } else if (bool !== undefined) {
      tokens.push({ text: bool, kind: "boolean" });
    } else if (nul !== undefined) {
      tokens.push({ text: nul, kind: "null" });
    }

    lastIndex = index + full.length;
  }

  if (lastIndex < value.length) {
    tokens.push({ text: value.slice(lastIndex), kind: "plain" });
  }

  return tokens;
}

/**
 * tr-Sözdizimi vurgulamalı JSON görüntüleyici.
 * en-Read-only JSON viewer with syntax highlighting. Falls back to plain
 *    monospace text when the payload is not JSON.
 * input (JsonViewerProps)
 * output (JSX.Element)
 */
export default function JsonViewer({
  value,
  isJson,
  maxHeight = 420,
}: JsonViewerProps) {
  const theme = useTheme();

  const colors = useMemo(
    () => ({
      key: theme.palette.kpi.sky,
      string: theme.palette.kpi.emerald,
      number: theme.palette.kpi.amber,
      boolean: theme.palette.kpi.violet,
      null: theme.palette.text.secondary,
      plain: theme.palette.text.primary,
    }),
    [theme]
  );

  const tokens = useMemo(
    () => (isJson ? tokenize(value) : null),
    [value, isJson]
  );

  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 2,
        maxHeight,
        overflow: "auto",
        borderRadius: 1.5,
        fontSize: 12.5,
        lineHeight: 1.65,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
        backgroundColor:
          theme.palette.mode === "dark"
            ? "rgba(0,0,0,0.28)"
            : "rgba(0,0,0,0.035)",
        border: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
        // Long single-line payloads must scroll, not stretch the layout.
        whiteSpace: "pre",
        tabSize: 2,
      }}
    >
      {tokens
        ? tokens.map((token, i) => (
            <Box
              key={i}
              component="span"
              sx={{ color: colors[token.kind] }}
            >
              {token.text}
            </Box>
          ))
        : value}
    </Box>
  );
}
