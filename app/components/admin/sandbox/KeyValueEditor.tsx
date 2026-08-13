"use client";

import { useCallback } from "react";
import {
  Box,
  Checkbox,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  useTheme,
} from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  KeyValueEditorProps,
  KeyValueRow,
} from "@/app/lib/type/admin/sandbox";

/**
 * tr-Yeni satır kimliği üretir.
 * en-Generates a row id. Rows are reordered and deleted by index, so each needs
 *    a stable key that survives edits.
 * input ()
 * output (string)
 */
function newRowId(): string {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * tr-Boş bir satır oluşturur.
 * en-Creates an empty, enabled row.
 * input ()
 * output (KeyValueRow)
 */
export function createEmptyRow(): KeyValueRow {
  return { id: newRowId(), key: "", value: "", enabled: true };
}

/**
 * tr-Başlık ve sorgu parametresi düzenleyicisi.
 * en-Editable key/value grid for headers and query params. Controlled — the
 *    parent page owns the rows and receives every change.
 * input (KeyValueEditorProps)
 * output (JSX.Element)
 */
export default function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
}: KeyValueEditorProps) {
  const theme = useTheme();
  const dict = useDictionary();

  const updateRow = useCallback(
    (id: string, patch: Partial<KeyValueRow>) => {
      onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    },
    [rows, onChange]
  );

  const removeRow = useCallback(
    (id: string) => {
      onChange(rows.filter((row) => row.id !== id));
    },
    [rows, onChange]
  );

  const addRow = useCallback(() => {
    onChange([...rows, createEmptyRow()]);
  }, [rows, onChange]);

  return (
    <Box>
      <Stack spacing={1}>
        {rows.map((row) => (
          <Stack
            key={row.id}
            direction="row"
            spacing={1}
            alignItems="center"
          >
            <Checkbox
              size="small"
              checked={row.enabled}
              onChange={(e) => updateRow(row.id, { enabled: e.target.checked })}
              inputProps={{ "aria-label": `${row.key || "row"} enabled` }}
              sx={{ p: 0.5 }}
            />
            <TextField
              size="small"
              value={row.key}
              onChange={(e) => updateRow(row.id, { key: e.target.value })}
              placeholder={keyPlaceholder}
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { style: { fontSize: 13 } } }}
            />
            <TextField
              size="small"
              value={row.value}
              onChange={(e) => updateRow(row.id, { value: e.target.value })}
              placeholder={valuePlaceholder}
              sx={{ flex: 1.4 }}
              slotProps={{ htmlInput: { style: { fontSize: 13 } } }}
            />
            <Tooltip title="Remove" arrow>
              <IconButton
                size="small"
                onClick={() => removeRow(row.id)}
                sx={{ color: theme.palette.text.secondary }}
              >
                <Trash2 size={14} />
              </IconButton>
            </Tooltip>
          </Stack>
        ))}
      </Stack>

      <Box
        component="button"
        type="button"
        onClick={addRow}
        sx={{
          mt: 1.25,
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.25,
          py: 0.6,
          fontSize: 12.5,
          fontWeight: 600,
          borderRadius: 1.25,
          cursor: "pointer",
          color: theme.palette.primary.main,
          background: "transparent",
          border: `1px dashed ${theme.palette.divider}`,
          fontFamily: "inherit",
          "&:hover": {
            backgroundColor: theme.palette.background.hoverBg,
          },
        }}
      >
        <Plus size={13} />
        {dict.admin.sandbox.api.addRow}
      </Box>
    </Box>
  );
}
