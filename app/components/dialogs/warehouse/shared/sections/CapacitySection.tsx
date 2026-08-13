import { Box, Grid, Stack, Typography, Button } from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import {
  WarehouseCapacity,
  WarehouseFormActions,
} from "@/app/lib/type/warehouse-form";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import GavelIcon from "@mui/icons-material/Gavel";
import SecurityIcon from "@mui/icons-material/Security";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import InventoryIcon from "@mui/icons-material/Inventory";

interface CapacitySectionProps {
  state: WarehouseCapacity;
  actions: WarehouseFormActions;
}

import { Dictionary } from "@/app/lib/language/language";

const SPECIFICATIONS = (dict: Dictionary) => [
  {
    label: dict.warehouses.categories.specs.coldStorage,
    value: "Cold Storage",
    icon: <AcUnitIcon fontSize="small" />,
  },
  {
    label: dict.warehouses.categories.specs.hazardous,
    value: "Hazardous Materials",
    icon: <WarningAmberIcon fontSize="small" />,
  },
  {
    label: dict.warehouses.categories.specs.bonded,
    value: "Bonded Warehouse",
    icon: <GavelIcon fontSize="small" />,
  },
  {
    label: dict.warehouses.categories.specs.crossDocking,
    value: "Cross-Docking",
    icon: <LocalShippingIcon fontSize="small" />,
  },
  {
    label: dict.warehouses.categories.specs.highSecurity,
    value: "High Security",
    icon: <SecurityIcon fontSize="small" />,
  },
  {
    label: dict.warehouses.categories.specs.lashing,
    value: "Lashing/Loading",
    icon: <InventoryIcon fontSize="small" />,
  },
];

const CapacitySection = ({ state, actions }: CapacitySectionProps) => {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();

  const f = dict.warehouses.dialogs.fields;
  const specItems = SPECIFICATIONS(dict);

  /* -------------------------------- handlers -------------------------------- */
  const toggleSpec = (specValue: string) => {
    const newSpecs = state.specifications.includes(specValue)
      ? state.specifications.filter((s) => s !== specValue)
      : [...state.specifications, specValue];
    actions.updateCapacity({ specifications: newSpecs });
  };

  return (
    <Box>
      <Stack spacing={4}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: "primary.main",
              boxShadow: (theme) => `0 0 10px ${theme.palette.primary.main}`,
            }}
          />
          <Typography variant="subtitle1" fontWeight={700} color="white">
            {dict.warehouses.dialogs.capacityTitle}
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {f.palletPositions}
              </Typography>
              <CustomTextArea
                name="capacityPallets"
                type="number"
                placeholder={f.palletPositionsPlaceholder}
                value={state.capacityPallets.toString()}
                onChange={(e) =>
                  actions.updateCapacity({
                    capacityPallets: parseInt(e.target.value) || 0,
                  })
                }
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {f.volume}
              </Typography>
              <CustomTextArea
                name="capacityVolumeM3"
                type="number"
                placeholder={f.volumePlaceholder}
                value={state.capacityVolumeM3.toString()}
                onChange={(e) =>
                  actions.updateCapacity({
                    capacityVolumeM3: parseInt(e.target.value) || 0,
                  })
                }
              />
            </Stack>
          </Grid>
        </Grid>

        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "primary.main",
              }}
            />
            <Typography variant="subtitle1" fontWeight={700} color="white">
              {f.specifications}
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            {specItems.map((spec) => {
              const isActive = state.specifications.includes(spec.value);
              return (
                <Grid size={{ xs: 6, sm: 4 }} key={spec.value}>
                  <Button
                    fullWidth
                    onClick={() => toggleSpec(spec.value)}
                    sx={{
                      height: 80,
                      borderRadius: 3,
                      border: (theme) =>
                        `1px solid ${isActive ? theme.palette.primary.main : theme.palette.divider_alpha.main_10}`,
                      bgcolor: (theme) =>
                        isActive
                          ? theme.palette.primary._alpha.main_05
                          : "transparent",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      textTransform: "none",
                      color: isActive ? "white" : "text.secondary",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        bgcolor: (theme) =>
                          isActive
                            ? theme.palette.primary._alpha.main_10
                            : theme.palette.divider_alpha.main_05,
                        borderColor: (theme) =>
                          isActive
                            ? theme.palette.primary.main
                            : theme.palette.divider_alpha.main_20,
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        color: isActive ? "primary.main" : "inherit",
                      }}
                    >
                      {spec.icon}
                    </Box>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      align="center"
                    >
                      {spec.label}
                    </Typography>
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        </Stack>

        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: (theme) => theme.palette.info._alpha.main_05,
            border: (theme) => `1px solid ${theme.palette.info._alpha.main_10}`,
          }}
        >
          <Typography
            variant="caption"
            color="info.main"
            sx={{ display: "block", mb: 0.5, fontWeight: 700 }}
          >
            {f.guidance}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {f.guidanceText}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default CapacitySection;
