import { Box, Stack, Typography, useTheme } from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import CustomCard from "@/app/components/cards/card";
import { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface UniqueSkusCardProps {
  warehouse: WarehouseWithRelations;
}

export const UniqueSkusCard = ({ warehouse }: UniqueSkusCardProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const t = dict.warehouses.dialogs.details;

  return (
    <CustomCard
      sx={{
        p: 1.5,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.kpi.violet_alpha.main_10,
        borderColor: theme.palette.kpi.violet_alpha.main_20,
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
        <Box
          sx={{
            p: 0.8,
            borderRadius: 1.5,
            bgcolor: theme.palette.kpi.violet_alpha.main_20,
            color: theme.palette.kpi.violet,
          }}
        >
          <InventoryIcon sx={{ fontSize: 20 }} />
        </Box>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
          {t.uniqueSkus}
        </Typography>
      </Stack>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="h5" fontWeight={800} color="text.primary">
          {warehouse._count?.inventory || 0}
        </Typography>
      </Box>
    </CustomCard>
  );
};
