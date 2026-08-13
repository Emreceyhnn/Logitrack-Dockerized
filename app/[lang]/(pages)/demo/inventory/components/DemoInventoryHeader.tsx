"use client";

import {
  Stack,
  Typography,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Box,
  useTheme,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

/**
 * Demo-only fork of InventoryHeader. The real header calls useWarehouses(),
 * which fetches the authenticated /api/warehouses endpoint — unavailable in
 * the public demo. This fork drops that hook and sources its warehouse filter
 * options from the fixed demo dataset passed in via props, so nothing here
 * reaches a real endpoint.
 */

interface DemoWarehouseOption {
  id: string;
  name: string;
}

interface DemoInventoryHeaderProps {
  value: string;
  onSearch: (value: string) => void;
  onAddClick: () => void;
  warehouseId?: string | undefined;
  status?: string[];
  onWarehouseChange?: (id: string) => void;
  onStatusChange?: (status: string[]) => void;
  warehouseOptions?: DemoWarehouseOption[];
}

const STOCK_STATUSES = [
  { value: "IN_STOCK", labelKey: "inStock" },
  { value: "LOW_STOCK", labelKey: "low" },
  { value: "OUT_OF_STOCK", labelKey: "out" },
];

const DemoInventoryHeader = ({
  value,
  onSearch,
  onAddClick,
  warehouseId,
  status = [],
  onWarehouseChange,
  onStatusChange,
  warehouseOptions = [],
}: DemoInventoryHeaderProps) => {
  const dict = useDictionary();
  const theme = useTheme();

  return (
    <Stack spacing={3} sx={{ mb: 4 }}>
      {/* Row 1: Title & Main Actions */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
      >
        <Stack spacing={0.5}>
          <Typography
            variant="h4"
            component="h1"
            fontWeight={800}
            sx={{
              letterSpacing: "-0.02em",
              color: "text.primary",
            }}
          >
            {dict.inventory.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ opacity: 0.8 }}
          >
            {dict.inventory.subtitle}
          </Typography>
        </Stack>

        <Button
          data-tour="inventory-add"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddClick}
          sx={{
            height: 48,
            textTransform: "none",
            fontWeight: 800,
            px: 4,
            borderRadius: "14px",
            whiteSpace: "nowrap",
            bgcolor: theme.palette.buttonPrimary.buttonBg,
            color: theme.palette.buttonPrimary.primaryText,
            boxShadow: `0 8px 20px ${theme.palette.buttonPrimary.buttonBg}40`,
            "&:hover": {
              bgcolor: theme.palette.buttonPrimary.buttonBgHover,
              boxShadow: `0 12px 28px ${theme.palette.buttonPrimary.buttonBg}60`,
              transform: "translateY(-2px)",
            },
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            width: { xs: "100%", md: "auto" },
          }}
        >
          {dict.inventory.addInventory}
        </Button>
      </Stack>

      {/* Row 2: Filter Bar */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2.5}
        alignItems="center"
        sx={{
          p: 2.5,
          borderRadius: "20px",
          bgcolor:
            theme.palette.mode === "dark"
              ? theme.palette.background.paper_alpha.main_40
              : theme.palette.common.white_alpha.main_60,
          backdropFilter: "blur(20px)",
          border: `1px solid ${theme.palette.divider_alpha.main_10}`,
          boxShadow:
            theme.palette.mode === "dark"
              ? `inset 0 0 0 1px ${theme.palette.divider_alpha.main_05}`
              : `0 10px 30px -10px ${theme.palette.common.black_alpha.main_10}`,
        }}
      >
        <TextField
          placeholder={dict.inventory.searchPlaceholder}
          size="small"
          value={value}
          onChange={(e) => onSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "primary.main", fontSize: 20 }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: "12px",
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "background.default"
                    : "background.paper",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "& fieldset": {
                  borderColor: theme.palette.divider_alpha.main_10,
                  transition: "all 0.2s ease",
                },
                "&:hover fieldset": {
                  borderColor: "primary.main",
                },
                "&.Mui-focused": {
                  bgcolor: theme.palette.background.paper,
                  boxShadow: `0 0 0 4px ${theme.palette.primary._alpha.main_15}`,
                  "& fieldset": {
                    borderColor: "primary.main",
                    borderWidth: "1.5px",
                  },
                },
                "& input::placeholder": {
                  color: "text.secondary",
                  opacity: 0.9,
                  fontWeight: 500,
                },
              },
            },
          }}
          sx={{
            width: { xs: "100%", md: 320 },
          }}
        />

        <Stack
          direction="row"
          spacing={2}
          flex={1}
          width={{ xs: "100%", md: "auto" }}
        >
          <FormControl size="small" sx={{ flex: 1, minWidth: 160 }}>
            <InputLabel sx={{ fontWeight: 600 }}>
              {dict.inventory.filters?.warehouse || "Warehouse"}
            </InputLabel>
            <Select
              value={warehouseId || ""}
              onChange={(e) => onWarehouseChange?.(e.target.value as string)}
              input={
                <OutlinedInput
                  label={dict.inventory.filters?.warehouse || "Warehouse"}
                  sx={{
                    borderRadius: "10px",
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "background.default"
                        : "background.paper",
                    "& fieldset": {
                      borderColor: theme.palette.divider_alpha.main_10,
                    },
                  }}
                />
              }
            >
              <MenuItem value="">
                <em style={{ opacity: 0.6 }}>{dict.common.all}</em>
              </MenuItem>
              {warehouseOptions.map((w) => (
                <MenuItem key={w.id} value={w.id} sx={{ py: 1.5 }}>
                  {w.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: 1, minWidth: 160 }}>
            <InputLabel sx={{ fontWeight: 600 }}>
              {dict.inventory.filters?.status || "Stock Status"}
            </InputLabel>
            <Select
              multiple
              value={status}
              onChange={(e) =>
                onStatusChange?.(
                  typeof e.target.value === "string"
                    ? e.target.value.split(",")
                    : (e.target.value as string[])
                )
              }
              input={
                <OutlinedInput
                  label={dict.inventory.filters?.status || "Stock Status"}
                  sx={{
                    borderRadius: "10px",
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "background.default"
                        : "background.paper",
                    "& fieldset": {
                      borderColor: theme.palette.divider_alpha.main_10,
                    },
                  }}
                />
              }
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(selected as string[]).map((s) => {
                    const opt = STOCK_STATUSES.find((o) => o.value === s);
                    const label =
                      dict.inventory.status[
                        opt?.labelKey as keyof typeof dict.inventory.status
                      ] || s;
                    return (
                      <Chip
                        key={s}
                        label={label}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          bgcolor: "primary._alpha.main_10",
                          color: "primary.main",
                          border: "none",
                        }}
                      />
                    );
                  })}
                </Box>
              )}
            >
              {STOCK_STATUSES.map((opt) => (
                <MenuItem key={opt.value} value={opt.value} sx={{ py: 1 }}>
                  <Checkbox
                    checked={status.indexOf(opt.value) > -1}
                    size="small"
                    sx={{ color: "primary.main" }}
                  />
                  <ListItemText
                    primary={
                      dict.inventory.status[
                        opt.labelKey as keyof typeof dict.inventory.status
                      ] || opt.value
                    }
                    slotProps={{
                      primary: { sx: { fontSize: 14, fontWeight: 500 } },
                    }}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default DemoInventoryHeader;
