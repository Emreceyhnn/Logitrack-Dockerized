"use client";

import { Avatar, Box, Grid, Paper, Stack, Typography, useTheme } from "@mui/material";
import {
  Scale as ScaleIcon,
  ViewInAr as VolumeIcon,
  GridOn as PalletIcon,
  Warehouse as WarehouseIcon,
  AutoAwesome as IntelIcon,
} from "@mui/icons-material";
import {
  InventoryDetailsProps,
  InventoryWithRelations,
} from "@/app/lib/type/inventory";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

type InventoryItem = NonNullable<InventoryDetailsProps["item"]>;

interface PhysicalSpecsPanelProps {
  item: InventoryItem;
  otherLocations: InventoryWithRelations[];
}

export default function PhysicalSpecsPanel({
  item,
  otherLocations,
}: PhysicalSpecsPanelProps) {
  const theme = useTheme();
  const dict = useDictionary();

  return (
    <Grid size={{ xs: 12, md: 7 }}>
      <Box sx={{ p: 4 }}>
        <Typography
          variant="caption"
          fontWeight={800}
          color="text.secondary"
          sx={{ letterSpacing: "1px", textTransform: "uppercase" }}
        >
          {dict.inventory.dialogs.physicalSpecs}
        </Typography>

        <Grid container spacing={3} mt={1}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                textAlign: "center",
                borderRadius: 4,
                bgcolor: theme.palette.background.paper_alpha.main_05,
                borderColor: theme.palette.divider_alpha.main_10,
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: theme.palette.primary._alpha.main_30,
                  bgcolor: theme.palette.primary._alpha.main_05,
                },
              }}
            >
              <ScaleIcon
                sx={{ color: "primary.main", mb: 1.5, fontSize: 32 }}
              />
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                {dict.inventory.fields.weight.toLocaleUpperCase('en-US')}
              </Typography>
              <Typography
                component="div"
                variant="h6"
                fontWeight={800}
                color="text.primary"
              >
                {item.weightKg}kg
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                textAlign: "center",
                borderRadius: 4,
                bgcolor: theme.palette.background.paper_alpha.main_05,
                borderColor: theme.palette.divider_alpha.main_10,
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: theme.palette.secondary._alpha.main_30,
                  bgcolor: theme.palette.secondary._alpha.main_05,
                },
              }}
            >
              <VolumeIcon
                sx={{ color: "secondary.main", mb: 1.5, fontSize: 32 }}
              />
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                {dict.inventory.fields.volume.toLocaleUpperCase('en-US')}
              </Typography>
              <Typography
                component="div"
                variant="h6"
                fontWeight={800}
                color="text.primary"
              >
                {item.volumeM3}m³
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                textAlign: "center",
                borderRadius: 4,
                bgcolor: theme.palette.background.paper_alpha.main_05,
                borderColor: theme.palette.divider_alpha.main_10,
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: theme.palette.success._alpha.main_30,
                  bgcolor: theme.palette.success._alpha.main_05,
                },
              }}
            >
              <PalletIcon
                sx={{ color: "success.main", mb: 1.5, fontSize: 32 }}
              />
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                {dict.inventory.fields.pallets.toLocaleUpperCase('en-US')}
              </Typography>
              <Typography
                component="div"
                variant="h6"
                fontWeight={800}
                color="text.primary"
              >
                {item.palletCount}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Box
          sx={{
            mt: 4,
            p: 2.5,
            borderRadius: 4,
            bgcolor: theme.palette.info._alpha.main_05,
            border: `1px solid ${theme.palette.info._alpha.main_10}`,
            display: "flex",
            gap: 2,
            alignItems: "flex-start",
          }}
        >
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: theme.palette.info._alpha.main_10,
              color: theme.palette.info.main,
              flexShrink: 0,
            }}
          >
            <IntelIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography
              variant="caption"
              fontWeight={800}
              color="info.main"
              sx={{ display: "block", mb: 0.5, letterSpacing: 0.5 }}
            >
              {dict.inventory.dialogs.intelTitle}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: "0.8rem", lineHeight: 1.6 }}
            >
              {dict.inventory.dialogs.intelDesc.replace(
                "{minStock}",
                item.minStock.toString()
              )}
            </Typography>
          </Box>

          {/* Other Locations Section */}
          {otherLocations.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography
                variant="caption"
                fontWeight={800}
                color="text.secondary"
                sx={{
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                {dict.inventory.dialogs.otherLocations}
              </Typography>
              <Stack spacing={1.5} mt={2}>
                {otherLocations.map((loc) => (
                  <Paper
                    key={loc.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: theme.palette.background.paper_alpha.main_05,
                      borderColor: theme.palette.divider_alpha.main_10,
                      borderRadius: 2,
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: theme.palette.primary._alpha.main_30,
                        bgcolor: theme.palette.background.paper_alpha.main_10,
                      },
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <WarehouseIcon
                          sx={{ color: "text.secondary", fontSize: 20 }}
                        />
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.primary"
                            fontWeight={700}
                          >
                            {loc.warehouse.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {loc.warehouse.code}
                          </Typography>
                        </Box>
                      </Stack>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography
                          component="div"
                          variant="h6"
                          color="primary.light"
                          fontWeight={800}
                        >
                          {loc.quantity}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            textTransform: "uppercase",
                            fontSize: "0.6rem",
                          }}
                        >
                          {dict.inventory.dialogs.units || "UNITS"}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
    </Grid>
  );
}
