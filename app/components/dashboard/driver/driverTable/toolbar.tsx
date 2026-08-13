"use client";

import {
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  SelectChangeEvent,
  IconButton,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import ClearIcon from "@mui/icons-material/Clear";
import { DriverStatus } from "@/app/lib/type/enums";
import { DriverFilters } from "@/app/lib/type/driver";
import { useEffect, useState } from "react";

interface DriverTableToolbarProps {
  filters: DriverFilters;
  onFilterChange: (newFilters: Partial<DriverFilters>) => void;
}

export default function DriverTableToolbar({
  filters,
  onFilterChange,
}: DriverTableToolbarProps) {
  const dict = useDictionary();
  /* --------------------------------- states --------------------------------- */
  const [searchTerm, setSearchTerm] = useState(filters.search || "");

  /* -------------------------------- lifecycle ------------------------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        onFilterChange({ search: searchTerm });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, filters.search, onFilterChange]);

  /* -------------------------------- handlers -------------------------------- */
  const handleStatusChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const statusArray = typeof value === "string" ? value.split(",") : value;
    onFilterChange({ status: statusArray as DriverStatus[] });
  };

  const vehicleFilterValue =
    filters.hasVehicle === true
      ? "assigned"
      : filters.hasVehicle === false
        ? "unassigned"
        : "all";

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      alignItems="center"
      sx={{ p: 2, bgcolor: "background.paper", borderRadius: 2, mb: 2 }}
    >
      <TextField
        size="small"
        placeholder={dict.drivers.table.searchPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setSearchTerm("")}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 250, flexGrow: 1 }}
      />

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>{dict.drivers.filters.status}</InputLabel>
        <Select
          multiple
          value={filters.status || []}
          onChange={handleStatusChange}
          label={dict.drivers.filters.status}
          renderValue={(selected) => (selected as string[]).join(", ")}
        >
          {Object.values(DriverStatus).map((status) => (
            <MenuItem key={status} value={status}>
              {status.replace("_", " ")}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>{dict.drivers.filters.vehicleAssignment}</InputLabel>
        <Select
          value={vehicleFilterValue}
          label={dict.drivers.filters.vehicleAssignment}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "all") onFilterChange({ hasVehicle: undefined });
            else if (val === "assigned") onFilterChange({ hasVehicle: true });
            else onFilterChange({ hasVehicle: false });
          }}
        >
          <MenuItem value="all">{dict.drivers.filters.all}</MenuItem>
          <MenuItem value="assigned">{dict.drivers.filters.assigned}</MenuItem>
          <MenuItem value="unassigned">{dict.drivers.filters.unassigned}</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}
