import {
  Box,
  Stack,
  Typography,
  IconButton,
  Grid,
  MenuItem,
} from "@mui/material";
import { useFormikContext } from "formik";
import {
  ShipmentFormValues,
  ShipmentStopWithRelations,
} from "@/app/lib/type/shipment";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import {
  AddressAutocomplete,
  AddressData,
} from "@/app/components/googleMaps/AddressAutocomplete";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Reorder, useDragControls } from "framer-motion";
import PersonIcon from "@mui/icons-material/Person";
import { CustomerWithRelations } from "@/app/lib/type/customer";

const StopItem = ({
  stop,
  index,
  remove,
  customers,
  isLast,
  syncTopLevelFields,
}: {
  stop: ShipmentStopWithRelations;
  index: number;
  remove: (index: number) => void;
  customers: CustomerWithRelations[];
  isLast: boolean;
  syncTopLevelFields: (stops: ShipmentStopWithRelations[]) => void;
}) => {
  const dict = useDictionary();
  const controls = useDragControls();
  const { values, setFieldValue } = useFormikContext<ShipmentFormValues>();

  const selectedCustomer = customers.find((c) => c.id === stop.customerId);

  return (
    <Reorder.Item
      value={stop}
      id={stop.id || `stop-${index}`}
      dragListener={false}
      dragControls={controls}
      style={{ listStyle: "none", marginBottom: "12px" }}
    >
      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.02)"
              : "rgba(0, 0, 0, 0.01)",
          border: (theme) => `1px solid ${theme.palette.divider}`,
          position: "relative",
          "&:hover": {
            border: (theme) => `1px solid ${theme.palette.primary.main}`,
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(0, 0, 0, 0.02)",
          },
          transition: "all 0.2s ease",
        }}
      >
        <Grid container spacing={2} alignItems="flex-start">
          <Grid
            size={{ xs: 0.5 }}
            sx={{ display: "flex", alignItems: "center", pt: 1 }}
          >
            <Box
              onPointerDown={(e) => controls.start(e)}
              sx={{
                cursor: "grab",
                "&:active": { cursor: "grabbing" },
                color: "text.secondary",
                display: "flex",
                alignItems: "center",
              }}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          </Grid>

          <Grid size={{ xs: 11.5 }}>
            <Stack spacing={2}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {dict.shipments.dialogs.sections.stop || "Stop"} {index + 1}
                  </Typography>
                </Stack>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => remove(index)}
                  sx={{
                    bgcolor: (theme) => theme.palette.error._alpha.main_10,
                    "&:hover": {
                      bgcolor: (theme) => theme.palette.error._alpha.main_20,
                    },
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Stack spacing={0.5}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      {dict.shipments.dialogs.fields.customerClient}
                    </Typography>
                    <CustomTextArea
                      name={`stops[${index}].customerId`}
                      select
                      value={stop.customerId || ""}
                      onChange={(e) => {
                        const customerId = e.target.value;
                        const customer = customers.find(
                          (c) => c.id === customerId
                        );
                        const defaultLoc =
                          customer?.locations?.find((l) => l.isDefault) ||
                          customer?.locations?.[0];

                        setFieldValue(`stops[${index}].customerId`, customerId);
                        setFieldValue(
                          `stops[${index}].customerLocationId`,
                          defaultLoc?.id || ""
                        );
                        setFieldValue(
                          `stops[${index}].address`,
                          defaultLoc?.address || ""
                        );
                        setFieldValue(
                          `stops[${index}].contactEmail`,
                          customer?.email || ""
                        );
                        setFieldValue(
                          `stops[${index}].lat`,
                          defaultLoc?.lat || null
                        );
                        setFieldValue(
                          `stops[${index}].lng`,
                          defaultLoc?.lng || null
                        );

                        if (isLast) {
                          const updatedStops = [...values.stops];
                          const existingStop = updatedStops[index];
                          if (existingStop) {
                            updatedStops[index] = {
                              ...existingStop,
                              customerId,
                              customerLocationId: defaultLoc?.id || "",
                              address: defaultLoc?.address || "",
                              lat: defaultLoc?.lat || null,
                              lng: defaultLoc?.lng || null,
                            };
                            syncTopLevelFields(updatedStops);
                          }
                        }
                      }}
                    >
                      <MenuItem value="">
                        <Typography variant="body2" color="text.secondary">
                          {dict.common?.manualEntry || "Manual Entry"}
                        </Typography>
                      </MenuItem>
                      {customers.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <PersonIcon
                              sx={{ fontSize: 16, color: "text.secondary" }}
                            />
                            <Typography variant="body2">{c.name}</Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </CustomTextArea>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <Stack spacing={0.5}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      {dict.shipments.dialogs.fields.deliveryLocation ||
                        "LOCATION"}
                    </Typography>
                    <CustomTextArea
                      name={`stops[${index}].customerLocationId`}
                      select
                      disabled={!stop.customerId}
                      value={stop.customerLocationId || ""}
                      onChange={(e) => {
                        const locId = e.target.value;
                        const loc = selectedCustomer?.locations?.find(
                          (l) => l.id === locId
                        );
                        if (loc) {
                          setFieldValue(
                            `stops[${index}].customerLocationId`,
                            locId
                          );
                          setFieldValue(`stops[${index}].address`, loc.address);
                          setFieldValue(`stops[${index}].lat`, loc.lat || null);
                          setFieldValue(`stops[${index}].lng`, loc.lng || null);

                          if (isLast) {
                            const updatedStops = [...values.stops];
                            const existingStop = updatedStops[index];
                            if (existingStop) {
                              updatedStops[index] = {
                                ...existingStop,
                                customerLocationId: locId,
                                address: loc.address,
                                lat: loc.lat || null,
                                lng: loc.lng || null,
                              };
                              syncTopLevelFields(updatedStops);
                            }
                          }
                        }
                      }}
                    >
                      {selectedCustomer?.locations?.length ? (
                        selectedCustomer.locations.map((l) => (
                          <MenuItem key={l.id} value={l.id}>
                            <Typography variant="body2">{l.name}</Typography>
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem value="" disabled>
                          <Typography variant="body2" color="text.secondary">
                            {dict.shipments.dialogs.fields.selectCustomerFirst}
                          </Typography>
                        </MenuItem>
                      )}
                    </CustomTextArea>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <Stack spacing={0.5}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      {dict.shipments.dialogs.fields.destination}
                    </Typography>
                    <AddressAutocomplete
                      placeholder={
                        dict.shipments.dialogs.fields.destinationPlaceholder
                      }
                      name={`stops[${index}].address`}
                      value={stop.address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFieldValue(`stops[${index}].address`, e.target.value)
                      }
                      onAddressSelect={(data: AddressData) => {
                        setFieldValue(
                          `stops[${index}].address`,
                          data.formattedAddress
                        );
                        setFieldValue(`stops[${index}].lat`, data.lat);
                        setFieldValue(`stops[${index}].lng`, data.lng);

                        if (isLast) {
                          const updatedStops = [...values.stops];
                          const existingStop = updatedStops[index];
                          if (existingStop) {
                            updatedStops[index] = {
                              ...existingStop,
                              address: data.formattedAddress,
                              lat: data.lat,
                              lng: data.lng,
                            };
                            syncTopLevelFields(updatedStops);
                          }
                        }
                      }}
                    />
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <Stack spacing={0.5}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      {dict.shipments.dialogs.fields.contactEmail ||
                        "CONTACT EMAIL"}
                    </Typography>
                    <CustomTextArea
                      name={`stops[${index}].contactEmail`}
                      placeholder="john@example.com"
                      value={stop.contactEmail || ""}
                      onChange={(e) =>
                        setFieldValue(
                          `stops[${index}].contactEmail`,
                          e.target.value
                        )
                      }
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Reorder.Item>
  );
};

export default StopItem;
