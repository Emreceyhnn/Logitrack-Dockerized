import { Stack, Typography, Tooltip, Chip, Button, Box, useTheme } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type { DataTableFilter } from "@/app/lib/type/dataTable";

interface DataTableActiveFiltersProps {
  filters: DataTableFilter[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void;
  totalActive: number;
}

export function DataTableActiveFilters({
  filters,
  activeFilters,
  onFilterChange,
  totalActive,
}: DataTableActiveFiltersProps) {
  const theme = useTheme();
  const dict = useDictionary();

  if (totalActive === 0) return null;

  return (
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
  );
}
