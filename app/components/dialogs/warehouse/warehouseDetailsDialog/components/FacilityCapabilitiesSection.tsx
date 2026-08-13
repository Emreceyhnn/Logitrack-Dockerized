import { Box, Stack, Typography, useTheme, Divider } from "@mui/material";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface FacilityCapabilitiesSectionProps {
  warehouse: WarehouseWithRelations;
}

export const FacilityCapabilitiesSection = ({
  warehouse,
}: FacilityCapabilitiesSectionProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const t = dict.warehouses.dialogs.details;

  return (
    <Box>
      <Divider sx={{ my: 1, borderColor: "divider" }} />
      <Typography
        variant="subtitle2"
        fontWeight={800}
        color="text.primary"
        mb={1}
      >
        {t.facilityCapabilities}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {warehouse.manager && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              mb: 1,
              bgcolor: theme.palette.info._alpha.main_10,
              color: theme.palette.info.main,
              px: 1.2,
              py: 0.6,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: theme.palette.info._alpha.main_20,
            }}
          >
            <ThermostatIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption" fontWeight={600}>
              {t.managedFacility}
            </Typography>
          </Stack>
        )}

        {warehouse.specifications?.map((spec, index) => {
          const specKeyMap: Record<string, string> = {
            "Temperature Controlled": "temperatureControlled",
            "Cold Storage": "coldStorage",
            "Hazardous Materials": "hazardous",
            "Hazmat Storage": "hazardous",
            "Bonded Warehouse": "bonded",
            "Cross-Docking": "crossDocking",
            "High Security": "highSecurity",
            "Lashing/Loading": "lashing",
            "Standard Storage": "standardStorage",
          };
          const key = specKeyMap[spec] || spec;
          return (
            <Stack
              key={index}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                mb: 1,
                bgcolor: "transparent",
                color: "text.secondary",
                px: 1,
                py: 0.5,
                borderRadius: 1.5,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <BusinessCenterIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" fontWeight={600}>
                {dict.warehouses.categories.specs[
                  key as keyof typeof dict.warehouses.categories.specs
                ] || spec}
              </Typography>
            </Stack>
          );
        })}

        {(!warehouse.specifications || warehouse.specifications.length === 0) && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              mb: 1,
              bgcolor: theme.palette.divider_alpha.main_05,
              color: "text.secondary",
              px: 1.2,
              py: 0.6,
              borderRadius: 1.5,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <BusinessCenterIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption" fontWeight={600}>
              {dict.warehouses.categories.specs.standardStorage}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};
