"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Dialog,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { Search, CornerDownLeft } from "lucide-react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type { CommandItem, CommandPaletteProps } from "@/app/lib/type/admin/shell";

/**
 * tr-Öğeleri arama terimine göre filtreler.
 * en-Filters items by a whitespace-tolerant substring match over label,
 *    group and keywords. Every term must match somewhere (AND semantics), so
 *    "log audit" narrows rather than widens.
 * input (items: CommandItem[], query: string)
 * output (CommandItem[])
 */
function filterItems(items: CommandItem[], query: string): CommandItem[] {
  const terms = query.toLocaleLowerCase("en-US").split(/\s+/).filter(Boolean);
  if (terms.length === 0) return items;

  return items.filter((item) => {
    const haystack = [item.label, item.group, ...(item.keywords ?? [])]
      .join(" ")
      .toLocaleLowerCase("en-US");
    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * tr-Global komut paleti (Ctrl/Cmd + K).
 * en-Global command palette. Owns only its query and cursor; open/close is
 *    controlled by AdminShell so the shortcut works from anywhere.
 * input (CommandPaletteProps)
 * output (JSX.Element)
 */
export default function CommandPalette({
  open,
  onClose,
  items,
}: CommandPaletteProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => filterItems(items, query), [items, query]);

  // Group results for display while keeping a flat index for keyboard nav —
  // the cursor must move across group boundaries as one continuous list.
  const grouped = useMemo(() => {
    const map = new Map<string, { item: CommandItem; index: number }[]>();
    results.forEach((item, index) => {
      const bucket = map.get(item.group) ?? [];
      bucket.push({ item, index });
      map.set(item.group, bucket);
    });
    return [...map.entries()];
  }, [results]);

  // Reset on each open so the palette never reopens mid-search.
  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  // Clamp the cursor when the result set shrinks under it.
  useEffect(() => {
    setCursor((c) => (c >= results.length ? 0 : c));
  }, [results.length]);

  const runItem = useCallback(
    (item: CommandItem | undefined) => {
      if (!item) return;
      onClose();
      if (item.href) {
        router.push(item.href);
        return;
      }
      void item.run?.();
    },
    [onClose, router]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCursor((c) => (results.length === 0 ? 0 : (c + 1) % results.length));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((c) =>
          results.length === 0 ? 0 : (c - 1 + results.length) % results.length
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        runItem(results[cursor]);
      }
    },
    [results, cursor, runItem]
  );

  // Keep the active row in view during keyboard navigation.
  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-index="${cursor}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            mt: -10,
            alignSelf: "flex-start",
            backgroundColor: alpha(theme.palette.background.paper, 0.92),
            backdropFilter: "blur(20px)",
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[24],
          },
        },
      }}
    >
      {/* Search field */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.75,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Search size={17} color={theme.palette.text.secondary} />
        <InputBase
          autoFocus
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={dict.admin.palette.placeholder}
          inputProps={{ "aria-label": dict.admin.palette.placeholder }}
          sx={{ fontSize: 14.5 }}
        />
      </Box>

      {/* Results */}
      <Box sx={{ maxHeight: 380, overflowY: "auto" }}>
        {results.length === 0 ? (
          <Typography
            sx={{
              px: 2,
              py: 4,
              textAlign: "center",
              color: theme.palette.text.secondary,
              fontSize: 13.5,
            }}
          >
            {dict.admin.palette.empty}
          </Typography>
        ) : (
          <List ref={listRef} dense disablePadding sx={{ py: 1 }}>
            {grouped.map(([group, entries]) => (
              <Box key={group}>
                <Typography
                  variant="overline"
                  sx={{
                    px: 2,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.7,
                    color: theme.palette.text.secondary,
                    opacity: 0.7,
                  }}
                >
                  {group}
                </Typography>
                {entries.map(({ item, index }) => (
                  <ListItemButton
                    key={item.id}
                    data-index={index}
                    selected={index === cursor}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => runItem(item)}
                    sx={{
                      mx: 1,
                      borderRadius: 1.25,
                      minHeight: 38,
                      "&.Mui-selected": {
                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      <Search size={15} color={theme.palette.text.secondary} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      slotProps={{ primary: { fontSize: 13.5 } }}
                    />
                    {index === cursor && (
                      <CornerDownLeft
                        size={13}
                        color={theme.palette.text.secondary}
                      />
                    )}
                  </ListItemButton>
                ))}
              </Box>
            ))}
          </List>
        )}
      </Box>
    </Dialog>
  );
}
