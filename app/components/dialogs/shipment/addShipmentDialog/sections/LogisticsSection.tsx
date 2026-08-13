import { Box, Grid, Stack, Typography, MenuItem, Chip, useTheme } from "@mui/material";
import { useFormikContext } from "formik";
import { ShipmentFormValues } from "@/app/lib/type/shipment";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

import { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import WarehouseIcon from "@mui/icons-material/Warehouse";

import { TrailerWithRelations } from "@/app/lib/type/trailer";
import { DriverWithRelations } from "@/app/lib/type/driver";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";
import MonitorWeightIcon from "@mui/icons-material/MonitorWeight";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import {
  annotateTrailers,
  sortTrailerOptions,
  annotateDrivers,
} from "../assignmentHelpers";

interface LogisticsSectionProps {
  warehouses: WarehouseWithRelations[];
  trailers: TrailerWithRelations[];
  /** Optional: the edit dialog reuses this section without driver assignment. */
  drivers?: DriverWithRelations[];
}

const LogisticsSection = ({ warehouses, trailers, drivers = [] }: LogisticsSectionProps) => {
  /* -------------------------------- variables ------------------------------- */

  const dict = useDictionary();
  const theme = useTheme();

  const { values, setFieldValue, handleBlur, touched, errors } =
    useFormikContext<ShipmentFormValues>();

  // Annotate against the current load so the picker reflects *this* shipment's
  // weight/volume, then keep eligible options at the top.
  const trailerOptions = sortTrailerOptions(
    annotateTrailers(trailers, values.weightKg || 0, values.volumeM3 || 0)
  );
  const driverOptions = annotateDrivers(drivers);

  return (
    <Box>
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "primary.main",
            }}
          />
          <Typography variant="subtitle2" fontWeight={700} color="white">
            {dict.shipments.dialogs.sections.logisticsParties}
          </Typography>
        </Stack>

        {/* Selected Origin Preview Card */}
        {values.originWarehouseId &&
          warehouses.find((w) => w.id === values.originWarehouseId) && (
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: (t) => t.palette.action.hover,
                border: (t) => `1px solid ${t.palette.divider}`,
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 1,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
                }}
              >
                <WarehouseIcon />
              </Box>
              <Stack spacing={0.25}>
                <Typography
                  variant="caption"
                  color="primary.light"
                  fontWeight={700}
                  sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}
                >
                  {dict.shipments.dialogs.fields.originWarehouse.toLocaleUpperCase('en-US')}
                </Typography>
                <Typography variant="body1" fontWeight={700} color="white">
                  {
                    warehouses.find((w) => w.id === values.originWarehouseId)
                      ?.name
                  }
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {
                    warehouses.find((w) => w.id === values.originWarehouseId)
                      ?.city
                  }
                  ,{" "}
                  {
                    warehouses.find((w) => w.id === values.originWarehouseId)
                      ?.address
                  }
                </Typography>
              </Stack>
            </Box>
          )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }} data-field="originWarehouseId">
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments.dialogs.fields.originWarehouse}
              </Typography>
              <CustomTextArea
                name="originWarehouseId"
                select
                placeholder={dict.shipments.dialogs.fields.originPlaceholder}
                value={values.originWarehouseId}
                onBlur={handleBlur}
                error={
                  touched.originWarehouseId && Boolean(errors.originWarehouseId)
                }
                helperText={
                  touched.originWarehouseId
                    ? (errors.originWarehouseId as string)
                    : undefined
                }
                onChange={(e) => {
                  const warehouseId = e.target.value;
                  const selectedWarehouse = warehouses.find(
                    (w) => w.id === warehouseId
                  );
                  if (selectedWarehouse) {
                    setFieldValue("originWarehouseId", warehouseId);
                    setFieldValue(
                      "originLat",
                      selectedWarehouse.lat ?? undefined
                    );
                    setFieldValue(
                      "originLng",
                      selectedWarehouse.lng ?? undefined
                    );
                  } else {
                    setFieldValue("originWarehouseId", warehouseId);
                  }
                }}
              >
                {warehouses.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <WarehouseIcon
                        sx={{ fontSize: 18, color: "text.secondary" }}
                      />
                      <Typography variant="body2">{w.name}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </CustomTextArea>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.trailers.assignTrailer || "ASSIGN TRAILER"}
              </Typography>
              <CustomTextArea
                name="trailerId"
                select
                placeholder={dict.trailers.selectTrailer || "Select trailer"}
                value={values.trailerId || ""}
                onBlur={handleBlur}
                error={touched.trailerId && Boolean(errors.trailerId)}
                helperText={
                  touched.trailerId ? (errors.trailerId as string) : undefined
                }
                onChange={(e) =>
                  setFieldValue("trailerId", e.target.value || null)
                }
              >
                <MenuItem value="">
                  <Typography variant="body2" color="text.secondary">
                    {dict.common.none || "None"}
                  </Typography>
                </MenuItem>
                {trailerOptions.map(
                  ({
                    trailer: t,
                    eligible,
                    isAvailable,
                    fitsCapacity,
                    availableWeight,
                    availableVolume,
                  }) => (
                    // Ineligible trailers are shown but disabled, with the reason
                    // (out of service / over capacity) as a badge — so the worker
                    // sees why up front rather than after selecting.
                    <MenuItem key={t.id} value={t.id} disabled={!eligible}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ width: "100%" }}
                      >
                        <LocalShippingIcon
                          sx={{ fontSize: 18, color: "text.secondary" }}
                        />
                        <Stack spacing={0} sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {t.plate} ({t.type})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {Math.max(0, Math.round(availableWeight))} kg ·{" "}
                            {Math.max(0, Math.round(availableVolume))} m³{" "}
                            {dict.shipments?.dialogs?.fields?.capacityFree || "free"}
                          </Typography>
                        </Stack>
                        {!isAvailable ? (
                          <Chip
                            size="small"
                            label={dict.trailers?.statuses?.[t.status] || t.status}
                            sx={{
                              height: 20,
                              fontSize: 10,
                              fontWeight: 700,
                              bgcolor: theme.palette.error._alpha.main_10,
                              color: "error.main",
                            }}
                          />
                        ) : !fitsCapacity ? (
                          <Chip
                            size="small"
                            label={dict.shipments?.dialogs?.fields?.overCapacity || "Over capacity"}
                            sx={{
                              height: 20,
                              fontSize: 10,
                              fontWeight: 700,
                              bgcolor: theme.palette.warning._alpha.main_10,
                              color: "warning.main",
                            }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label={dict.shipments?.dialogs?.fields?.availableLabel || "Available"}
                            sx={{
                              height: 20,
                              fontSize: 10,
                              fontWeight: 700,
                              bgcolor: theme.palette.success._alpha.main_10,
                              color: "success.main",
                            }}
                          />
                        )}
                      </Stack>
                    </MenuItem>
                  )
                )}
              </CustomTextArea>
            </Stack>

            {/* Trailer Capacity Alerts */}
            {(() => {
              const selectedTrailer = trailers.find(
                (t) => t.id === values.trailerId
              );

              const tolerance = 0.01;
              const isWeightOver =
                selectedTrailer &&
                selectedTrailer.maxLoadKg > 0 &&
                Math.round(values.weightKg * 100) / 100 >
                  selectedTrailer.maxLoadKg + tolerance;

              const isVolumeOver =
                selectedTrailer &&
                selectedTrailer.capacityVolumeM3 > 0 &&
                Math.round(values.volumeM3 * 100) / 100 >
                  selectedTrailer.capacityVolumeM3 + tolerance;

              if (isWeightOver || isVolumeOver) {
                return (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {isWeightOver && (
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{
                          color: "error.main",
                          bgcolor: (theme) =>
                            theme.palette.error._alpha.main_10,
                          px: 2,
                          py: 1,
                          borderRadius: 2,
                          border: (theme) =>
                            `1px solid ${theme.palette.error._alpha.main_20}`,
                        }}
                      >
                        <MonitorWeightIcon sx={{ fontSize: 18 }} />
                        <Typography variant="caption" fontWeight={700}>
                          {dict.shipments.dialogs.fields.exceedsTrailerWeight}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ opacity: 0.8, ml: "auto" }}
                        >
                          Max: <b>{selectedTrailer?.maxLoadKg} kg</b>
                        </Typography>
                      </Stack>
                    )}
                    {isVolumeOver && (
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{
                          color: "error.main",
                          bgcolor: (theme) =>
                            theme.palette.error._alpha.main_10,
                          px: 2,
                          py: 1,
                          borderRadius: 2,
                          border: (theme) =>
                            `1px solid ${theme.palette.error._alpha.main_20}`,
                        }}
                      >
                        <ViewInArIcon sx={{ fontSize: 18 }} />
                        <Typography variant="caption" fontWeight={700}>
                          {dict.shipments.dialogs.fields.exceedsTrailerVolume}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ opacity: 0.8, ml: "auto" }}
                        >
                          Max: <b>{selectedTrailer?.capacityVolumeM3} m³</b>
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                );
              }
              return null;
            })()}
          </Grid>

          {driverOptions.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }} data-field="driverId">
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments?.dialogs?.fields?.assignDriver || "ASSIGN DRIVER"}
              </Typography>
              <CustomTextArea
                name="driverId"
                select
                placeholder={dict.shipments?.dialogs?.fields?.selectDriver || "Select driver"}
                value={values.driverId || ""}
                onChange={(e) => setFieldValue("driverId", e.target.value || null)}
              >
                <MenuItem value="">
                  <Typography variant="body2" color="text.secondary">
                    {dict.common.none || "None"}
                  </Typography>
                </MenuItem>
                {driverOptions.map(({ driver: d, isAvailable, rating }) => (
                  // Unavailable drivers stay visible but disabled; the rating +
                  // status badges make the best/available choice obvious at
                  // assignment time.
                  <MenuItem key={d.id} value={d.id} disabled={!isAvailable}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ width: "100%" }}
                    >
                      <PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                      <Stack spacing={0} sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {d.user.name} {d.user.surname}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dict.drivers?.statuses?.[d.status] || d.status}
                        </Typography>
                      </Stack>
                      {rating !== null && (
                        <Chip
                          size="small"
                          icon={<StarIcon sx={{ fontSize: "14px !important" }} />}
                          label={rating.toFixed(1)}
                          sx={{
                            height: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            bgcolor: theme.palette.warning._alpha.main_10,
                            color: "warning.main",
                            "& .MuiChip-icon": { color: theme.palette.warning.main },
                          }}
                        />
                      )}
                      {!isAvailable && (
                        <Chip
                          size="small"
                          label={dict.shipments?.dialogs?.fields?.unavailableLabel || "Busy"}
                          sx={{
                            height: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            bgcolor: theme.palette.error._alpha.main_10,
                            color: "error.main",
                          }}
                        />
                      )}
                    </Stack>
                  </MenuItem>
                ))}
              </CustomTextArea>
            </Stack>
          </Grid>
          )}

          <Grid size={{ xs: 12, md: 3 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments.dialogs.fields.billingAccount}
              </Typography>
              <CustomTextArea
                name="billingAccount"
                select
                value={values.billingAccount}
                onBlur={handleBlur}
                error={touched.billingAccount && Boolean(errors.billingAccount)}
                helperText={
                  touched.billingAccount
                    ? (errors.billingAccount as string)
                    : undefined
                }
                onChange={(e) =>
                  setFieldValue("billingAccount", e.target.value)
                }
              >
                <MenuItem value="Standard Billing (Net 30)">
                  Standard Billing (Net 30)
                </MenuItem>
                <MenuItem value="Prepaid">Prepaid</MenuItem>
                <MenuItem value="Collect">Collect</MenuItem>
              </CustomTextArea>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default LogisticsSection;
