import {
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  OutlinedInput,
  Checkbox,
  ListItemText,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { VehicleStatus, VehicleType } from "@/app/lib/type/enums";
import { useState, useEffect } from "react";
import { SelectChangeEvent } from "@mui/material";
import { VehicleToolbarProps } from "@/app/lib/type/vehicle";

const STATUS_OPTIONS = Object.values(VehicleStatus);
const TYPE_OPTIONS = Object.values(VehicleType);

import { useDictionary } from "@/app/lib/language/DictionaryContext";

export default function VehicleToolbar({
  state,
  actions,
}: VehicleToolbarProps) {
  const dict = useDictionary();
  const { filters } = state;
  const { updateFilters: onFilterChange } = actions;
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
    const {
      target: { value },
    } = event;
    onFilterChange({
      status: (typeof value === "string"
        ? value.split(",")
        : value) as VehicleStatus[],
    });
  };

  const handleTypeChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    onFilterChange({
      type: (typeof value === "string"
        ? value.split(",")
        : value) as VehicleType[],
    });
  };

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      alignItems="center"
      sx={{ p: 2, bgcolor: "background.paper", borderRadius: 2, mb: 2 }}
    >
      <TextField
        placeholder={dict.vehicles.table.searchPlaceholder}
        size="small"
        fullWidth
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 250, flexGrow: 1 }}
      />

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="status-filter-label">{dict.vehicles.fields.status}</InputLabel>
        <Select
          labelId="status-filter-label"
          multiple
          value={filters.status || []}
          onChange={handleStatusChange}
          input={<OutlinedInput label={dict.vehicles.fields.status} />}
          renderValue={(selected) => (selected as string[]).map(s => dict.vehicles.statuses[s as keyof typeof dict.vehicles.statuses] || s).join(", ")}
        >
          {STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>
              <Checkbox checked={(filters.status || []).indexOf(status) > -1} />
              <ListItemText primary={dict.vehicles.statuses[status as keyof typeof dict.vehicles.statuses] || status} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="type-filter-label">{dict.vehicles.fields.type}</InputLabel>
        <Select
          labelId="type-filter-label"
          multiple
          value={filters.type || []}
          onChange={handleTypeChange}
          input={<OutlinedInput label={dict.vehicles.fields.type} />}
          renderValue={(selected) => (selected as string[]).map(t => dict.vehicles.types[t as keyof typeof dict.vehicles.types] || t).join(", ")}
        >
          {TYPE_OPTIONS.map((type) => (
            <MenuItem key={type} value={type}>
              <Checkbox checked={(filters.type || []).indexOf(type) > -1} />
              <ListItemText primary={dict.vehicles.types[type as keyof typeof dict.vehicles.types] || type} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
