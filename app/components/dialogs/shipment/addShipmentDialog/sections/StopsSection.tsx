import {
  Box,
  Stack,
  Typography,
  Button,
  Grid,
  MenuItem,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import { FieldArray, useFormikContext } from "formik";
import {
  ShipmentFormValues,
  ShipmentStopWithRelations,
} from "@/app/lib/type/shipment";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { AddressAutocomplete } from "@/app/components/googleMaps/AddressAutocomplete";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import AddIcon from "@mui/icons-material/Add";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { Reorder, AnimatePresence } from "framer-motion";
import PersonIcon from "@mui/icons-material/Person";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { toast } from "sonner";
import {
  optimizeStopOrder,
  canOptimize,
  sameOrder,
} from "../routeOptimize";
import { CustomerWithRelations } from "@/app/lib/type/customer";
import { AddressData } from "@/app/components/googleMaps/AddressAutocomplete";
import StopItem from "./StopItem";

interface StopsSectionProps {
  customers: CustomerWithRelations[];
}

const StopsSection = ({ customers }: StopsSectionProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const { values, setFieldValue } = useFormikContext<ShipmentFormValues>();

  const [entryData, setEntryData] = useState({
    customerId: "",
    customerLocationId: "",
    address: "",
    contactEmail: "",
    lat: null as number | null,
    lng: null as number | null,
  });

  // Imperative sync function to ensure top-level fields match the last stop immediately
  const syncTopLevelFields = (currentStops: ShipmentStopWithRelations[]) => {
    const lastStop = currentStops[currentStops.length - 1];
    if (lastStop) {
      // Atomic updates via setValues or sequential setFieldValue
      // We use setFieldValue here for consistency with the rest of the form
      setFieldValue("destination", lastStop.address);
      setFieldValue("destinationLat", lastStop.lat ?? undefined);
      setFieldValue("destinationLng", lastStop.lng ?? undefined);
      setFieldValue("customerId", lastStop.customerId || "");
      setFieldValue("customerLocationId", lastStop.customerLocationId || "");
    } else {
      setFieldValue("destination", "");
      setFieldValue("destinationLat", undefined);
      setFieldValue("destinationLng", undefined);
      setFieldValue("customerId", "");
      setFieldValue("customerLocationId", "");
    }
  };

  const handleReorder = (newStops: ShipmentStopWithRelations[]) => {
    const updatedStops = newStops.map((stop, idx) => ({
      ...stop,
      sequence: idx,
    }));
    setFieldValue("stops", updatedStops);
    syncTopLevelFields(updatedStops);
  };

  // Optional suggestion: reorder stops nearest-first from the origin. It only
  // reorders — the dispatcher can still drag afterwards — and toasts when the
  // current order is already optimal so the click never feels like a no-op.
  const origin =
    typeof values.originLat === "number" && typeof values.originLng === "number"
      ? { lat: values.originLat, lng: values.originLng }
      : null;
  const optimizable = canOptimize(values.stops, origin);

  const handleOptimize = () => {
    const optimized = optimizeStopOrder(values.stops, origin);
    if (sameOrder(optimized, values.stops)) {
      toast.info(dict.shipments?.dialogs?.sections?.routeAlreadyOptimal || "Route is already optimal");
      return;
    }
    handleReorder(optimized);
    toast.success(dict.shipments?.dialogs?.sections?.routeOptimized || "Stops reordered by nearest route");
  };

  const addStop = (data: typeof entryData) => {
    if (!data.address) return;

    const newStop: ShipmentStopWithRelations = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerId: data.customerId || null,
      customerLocationId: data.customerLocationId || null,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      contactEmail: data.contactEmail,
      sequence: values.stops.length,
    };

    const updatedStops = [...values.stops, newStop];
    setFieldValue("stops", updatedStops);
    syncTopLevelFields(updatedStops);

    // Clear entry fields
    setEntryData({
      customerId: "",
      customerLocationId: "",
      address: "",
      contactEmail: "",
      lat: null,
      lng: null,
    });
  };

  return (
    <Box
      data-field="destination"
      sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <FieldArray name="stops">
        {(fieldArrayProps) => {
          const { remove: formikRemove } = fieldArrayProps;

          const handleRemove = (index: number) => {
            const newList = values.stops.filter((_, i) => i !== index);
            formikRemove(index);
            syncTopLevelFields(newList);
          };

          return (
            <Stack
              spacing={3}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 4,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.03)"
                      : "rgba(0, 0, 0, 0.02)",
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  flexShrink: 0,
                }}
              >
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AddIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      {dict.shipments.dialogs.sections.addStop ||
                        "Quick Add Stop"}
                    </Typography>
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
                          name="tempCustomerId"
                          select
                          value={entryData.customerId}
                          onChange={(e) => {
                            const customerId = e.target.value;
                            const customer = customers.find(
                              (c) => c.id === customerId
                            );
                            const defaultLoc =
                              customer?.locations?.find((l) => l.isDefault) ||
                              customer?.locations?.[0];

                            setEntryData({
                              ...entryData,
                              customerId,
                              customerLocationId: defaultLoc?.id || "",
                              address: defaultLoc?.address || "",
                              contactEmail: customer?.email || "",
                              lat: defaultLoc?.lat || null,
                              lng: defaultLoc?.lng || null,
                            });
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
                                <Typography variant="body2">
                                  {c.name}
                                </Typography>
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
                          name="tempLocationId"
                          select
                          disabled={!entryData.customerId}
                          value={entryData.customerLocationId}
                          onChange={(e) => {
                            const locId = e.target.value;
                            const customer = customers.find(
                              (c) => c.id === entryData.customerId
                            );
                            const loc = customer?.locations?.find(
                              (l) => l.id === locId
                            );
                            if (loc) {
                              setEntryData({
                                ...entryData,
                                customerLocationId: locId,
                                address: loc.address,
                                lat: loc.lat || null,
                                lng: loc.lng || null,
                              });
                            }
                          }}
                        >
                          {customers.find((c) => c.id === entryData.customerId)
                            ?.locations?.length ? (
                            customers
                              .find((c) => c.id === entryData.customerId)!
                              .locations!.map((l) => (
                                <MenuItem key={l.id} value={l.id}>
                                  <Typography variant="body2">
                                    {l.name}
                                  </Typography>
                                </MenuItem>
                              ))
                          ) : (
                            <MenuItem value="" disabled>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {
                                  dict.shipments.dialogs.fields
                                    .selectCustomerFirst
                                }
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
                          name="tempAddress"
                          value={entryData.address}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEntryData({
                              ...entryData,
                              address: e.target.value,
                            })
                          }
                          onAddressSelect={(data: AddressData) => {
                            // Selecting an address only fills the entry fields;
                            // the "Add" button is the single commit path (same
                            // as picking a customer), so there's one clear way
                            // to add a stop.
                            setEntryData({
                              ...entryData,
                              address: data.formattedAddress,
                              lat: data.lat,
                              lng: data.lng,
                            });
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
                          name="tempContactEmail"
                          placeholder="john@example.com"
                          value={entryData.contactEmail}
                          onChange={(e) =>
                            setEntryData({
                              ...entryData,
                              contactEmail: e.target.value,
                            })
                          }
                        />
                      </Stack>
                    </Grid>
                  </Grid>

                  <Button
                    variant="contained"
                    fullWidth
                    disabled={!entryData.address}
                    onClick={() => addStop(entryData)}
                    startIcon={<AddIcon />}
                    sx={{
                      borderRadius: 2,
                      py: 1.25,
                      textTransform: "none",
                      fontWeight: 800,
                      boxShadow: "none",
                      background: (theme) =>
                        `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      "&:hover": {
                        boxShadow: (theme) =>
                          `0 8px 20px ${theme.palette.primary._alpha.main_30}`,
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    {dict.common.add || "Add to Route"}
                  </Button>
                </Stack>
              </Box>

              <Stack
                spacing={2}
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ flexShrink: 0 }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LocationOnIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={700}>
                      {dict.shipments.dialogs.sections.shipmentStops ||
                        "Planned Route"}{" "}
                      ({values.stops.length})
                    </Typography>
                  </Stack>
                  {optimizable && (
                    <Button
                      size="small"
                      onClick={handleOptimize}
                      startIcon={<AutoFixHighIcon sx={{ fontSize: "16px !important" }} />}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: 2,
                        color: "primary.main",
                        bgcolor: (theme) => theme.palette.primary._alpha.main_08,
                        "&:hover": {
                          bgcolor: (theme) => theme.palette.primary._alpha.main_12,
                        },
                      }}
                    >
                      {dict.shipments?.dialogs?.sections?.optimizeRoute || "Optimize order"}
                    </Button>
                  )}
                </Stack>

                <Box sx={{ flex: 1, pr: 1, minHeight: 0 }}>
                  {values.stops.length === 0 ? (
                    <Box
                      sx={{
                        p: 4,
                        textAlign: "center",
                        borderRadius: 3,
                        border: `2px dashed ${theme.palette.divider}`,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.01)"
                            : "rgba(0, 0, 0, 0.005)",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {dict.shipments.dialogs.sections.noStopsDefined ||
                          "No stops defined. Click + to add stops."}
                      </Typography>
                    </Box>
                  ) : (
                    <Reorder.Group
                      axis="y"
                      values={values.stops}
                      onReorder={handleReorder}
                      style={{ padding: 0 }}
                    >
                      <AnimatePresence>
                        {values.stops.map((stop, index) => (
                          <StopItem
                            key={stop.id || `stop-${index}`}
                            stop={stop}
                            index={index}
                            remove={handleRemove}
                            customers={customers}
                            isLast={index === values.stops.length - 1}
                            syncTopLevelFields={syncTopLevelFields}
                          />
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  )}
                </Box>
              </Stack>
            </Stack>
          );
        }}
      </FieldArray>
    </Box>
  );
};

export default StopsSection;
