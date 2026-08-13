"use client";

import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { SelectChangeEvent } from "@mui/material";
import { useState, useEffect, useCallback, useRef } from "react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type { DataTableFilter } from "@/app/lib/type/dataTable";

interface DataTableToolbarProps {
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  filters: DataTableFilter[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void;
}

export default function DataTableToolbar({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filters,
  activeFilters,
  onFilterChange,
}: DataTableToolbarProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const [localSearch, setLocalSearch] = useState(searchValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
     
    setLocalSearch(searchValue);
  }, [searchValue]);

  const commonInputStyles = {
    borderRadius: "10px",
    fontSize: 14,
    height: 40,
    bgcolor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.03)"
        : "rgba(0, 0, 0, 0.02)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "& fieldset": {
      borderColor: theme.palette.divider,
      opacity: 0.8,
      transition: "all 0.3s ease",
    },
    "&:hover fieldset": {
      borderColor: "primary.main",
      opacity: 1,
    },
    "&.Mui-focused": {
      bgcolor:
        theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#fff",
      boxShadow: `0 0 0 4px ${theme.palette.primary._alpha.main_15}`,
      "& fieldset": {
        borderColor: "primary.main",
        borderWidth: "1.5px",
        opacity: 1,
      },
    },
  };

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearchChange(value);
      }, 400);
    },
    [onSearchChange]
  );

  const handleFilterChange = (
    key: string,
    event: SelectChangeEvent<string | string[]>,
    isMultiple: boolean
  ) => {
    const { value } = event.target;
    if (isMultiple) {
      onFilterChange(
        key,
        typeof value === "string" ? value.split(",") : (value as string[])
      );
    } else {
      onFilterChange(key, value ? [value as string] : []);
    }
  };

  const totalActive = Object.entries(activeFilters).filter(([, values]) => {
    return values && values.length > 0;
  }).length;

  return (
    <>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: theme.palette.background.paper_alpha.main_60,
        }}
      >
        <TextField
          placeholder={searchPlaceholder}
          size="small"
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Tooltip
                    title={dict.common.tooltips?.search || "Search"}
                    arrow
                  >
                    <SearchIcon
                      sx={{ color: "text.secondary", fontSize: 20 }}
                    />
                  </Tooltip>
                </InputAdornment>
              ),
            },
            htmlInput: {
              "aria-label": searchPlaceholder,
            },
          }}
          sx={{
            flex: 1,
            minWidth: 220,
            "& .MuiOutlinedInput-root": {
              ...commonInputStyles,
              "& input::placeholder": {
                color: theme.palette.text.secondary,
                opacity: 1,
                fontWeight: 500,
              },
            },
          }}
        />

        {filters.map((filter) => {
          const isMultiple = filter.multiple !== false;
          const selectedArr = activeFilters[filter.key] ?? [];

          const selectValue = isMultiple ? selectedArr : selectedArr[0] || "";

          return (
            <FormControl key={filter.key} size="small" sx={{ minWidth: 160 }}>
              <InputLabel sx={{ fontSize: 14 }}>
                {filter.label}
              </InputLabel>
              <Select
                multiple={isMultiple}
                value={selectValue}
                onChange={(e) => handleFilterChange(filter.key, e, isMultiple)}
                input={<OutlinedInput label={filter.label} size="small" />}
                renderValue={(sel) => {
                  const arr = isMultiple
                    ? (sel as string[])
                    : sel
                      ? [sel as string]
                      : [];
                  if (arr.length === 0) {
                    return (
                      <Typography variant="caption" color="text.secondary">
                        {dict.common.all}
                      </Typography>
                    );
                  }
                  return (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" alignItems="center">
                      {arr.slice(0, 2).map((v) => {
                        const opt = filter.options.find(o => o.value === v);
                        const label = opt ? opt.label : v.replace(/_/g, " ");
                        return (
                          <Chip
                            key={v}
                            label={label}
                            size="small"
                            sx={{ fontSize: 11, height: 20 }}
                          />
                        );
                      })}
                      {arr.length > 2 && (
                        <Chip
                          label={`+${arr.length - 2}`}
                          size="small"
                          sx={{ fontSize: 11, height: 20 }}
                        />
                      )}
                    </Stack>
                  );
                }}
                sx={{
                  ...commonInputStyles,
                  "& .MuiSelect-select": {
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                  },
                }}
              >
                {!isMultiple && (
                  <MenuItem value="">
                    <ListItemText
                      primary={dict.common.all}
                      slotProps={{
                        primary: {
                          sx: {
                            fontSize: 13,
                            fontStyle: "italic",
                            opacity: 0.7,
                          },
                        },
                      }}
                    />
                  </MenuItem>
                )}
                {filter.options.map((opt) => (
                  <MenuItem
                    key={opt.value}
                    value={opt.value}
                    sx={{ fontSize: 13 }}
                  >
                    {isMultiple && (
                      <Checkbox
                        size="small"
                        checked={selectedArr.indexOf(opt.value) > -1}
                        sx={{ py: 0.5 }}
                      />
                    )}
                    <ListItemText
                      primary={opt.label}
                      slotProps={{ primary: { sx: { fontSize: 13 } } }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        })}
      </Stack>
      {totalActive > 0 && (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          alignItems="center"
          sx={{
            px: 2,
            pb: 1.5,
            mt: -0.5,
            bgcolor: theme.palette.background.paper_alpha.main_60,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, mr: 1 }}
          >
            {dict.common.filtersActive?.replace(
              "{count}",
              totalActive.toString()
            ) || `${totalActive} active filters`}
            :
          </Typography>

          {Object.entries(activeFilters).map(([key, values]) => {
            const filter = filters.find((f) => f.key === key);
            if (!filter || !values || values.length === 0) return null;

            return values.map((val) => {
              const option = filter.options.find((o) => o.value === val);
              const label = option ? option.label : val.replace(/_/g, " ");

              return (
                <Tooltip
                  key={`${key}-${val}`}
                  title={
                    dict.common.tooltips?.filterBy?.replace("{value}", label) ||
                    `Filter by ${label}`
                  }
                  arrow
                >
                  <Chip
                    label={`${filter.label}: ${label}`}
                    size="small"
                    onDelete={() => {
                      const newValues = values.filter((v) => v !== val);
                      onFilterChange(key, newValues);
                    }}
                    sx={{
                      bgcolor: theme.palette.primary._alpha.main_10,
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      borderRadius: "6px",
                      border: `1px solid ${theme.palette.primary._alpha.main_20}`,
                      "& .MuiChip-deleteIcon": {
                        color: theme.palette.primary.main,
                        fontSize: 14,
                        "&:hover": { color: theme.palette.primary.dark },
                      },
                    }}
                  />
                </Tooltip>
              );
            });
          })}

          <Button
            size="small"
            variant="text"
            onClick={() => {
              Object.keys(activeFilters).forEach((key) => {
                onFilterChange(key, []);
              });
            }}
            sx={{
              fontSize: "0.75rem",
              fontWeight: 800,
              color: "primary.main",
              minWidth: "auto",
              ml: 1.5,
              textTransform: "none",
              "&:hover": {
                bgcolor: "primary._alpha.main_10",
                textDecoration: "underline",
              },
            }}
          >
            {dict.common.clearAll}
          </Button>

          <Box sx={{ flex: 1 }} />
        </Stack>
      )}
    </>
  );
}
