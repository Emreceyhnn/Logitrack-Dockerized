import { Box, Stack, Typography, useTheme } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import CustomCard from "@/app/components/cards/card";
import { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface LocationDetailsCardProps {
  warehouse: WarehouseWithRelations;
}

export const LocationDetailsCard = ({ warehouse }: LocationDetailsCardProps) => {
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
        bgcolor: theme.palette.kpi.amber_alpha.main_10,
        borderColor: theme.palette.kpi.amber_alpha.main_20,
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
        <Box
          sx={{
            p: 0.8,
            borderRadius: 1.5,
            bgcolor: theme.palette.kpi.amber_alpha.main_20,
            color: theme.palette.kpi.amber,
          }}
        >
          <MapIcon sx={{ fontSize: 20 }} />
        </Box>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
          {t.locationDetails}
        </Typography>
      </Stack>
      <Stack spacing={1}>
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", fontSize: "0.65rem", lineHeight: 1 }}
          >
            {t.address}
          </Typography>
          <Typography
            variant="caption"
            color="text.primary"
            fontWeight={600}
            sx={{ display: "block" }}
          >
            {warehouse.address}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", fontSize: "0.65rem", lineHeight: 1 }}
          >
            {t.cityCountry}
          </Typography>
          <Typography
            variant="caption"
            color="text.primary"
            fontWeight={600}
            sx={{ display: "block" }}
          >
            {warehouse.city}, {warehouse.country}
          </Typography>
        </Box>
      </Stack>
    </CustomCard>
  );
};
