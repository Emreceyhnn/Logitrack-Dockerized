import {
  Box,
  Stack,
  Typography,
  Grid,
  MenuItem,
  Button,
} from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { CustomerWithRelations } from "@/app/lib/type/customer";
import { AddressAutocomplete, AddressData } from "@/app/components/googleMaps/AddressAutocomplete";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import AddIcon from "@mui/icons-material/Add";
import PersonIcon from "@mui/icons-material/Person";

export interface StopEntryData {
  customerId: string;
  customerLocationId: string;
  address: string;
  contactEmail: string;
  lat: number | null;
  lng: number | null;
}

interface StopEntryFormProps {
  entryData: StopEntryData;
  setEntryData: (data: StopEntryData) => void;
  customers: CustomerWithRelations[];
  addStop: (data: StopEntryData) => void;
}

export const StopEntryForm = ({
  entryData,
  setEntryData,
  customers,
  addStop,
}: StopEntryFormProps) => {
  const dict = useDictionary();

  const selectedEntryCustomer = customers.find(
    (c) => c.id === entryData.customerId
  );

  return (
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
            {dict.shipments.dialogs.sections.addStop || "Quick Add Stop"}
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
                  const customer = customers.find((c) => c.id === customerId);
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
                    <Stack direction="row" spacing={1} alignItems="center">
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
                {dict.shipments.dialogs.fields.deliveryLocation || "LOCATION"}
              </Typography>
              <CustomTextArea
                name="tempCustomerLocationId"
                select
                disabled={!entryData.customerId}
                value={entryData.customerLocationId}
                onChange={(e) => {
                  const locId = e.target.value;
                  const loc = selectedEntryCustomer?.locations?.find(
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
                {selectedEntryCustomer?.locations?.length ? (
                  selectedEntryCustomer.locations.map((l) => (
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
                name="tempAddress"
                value={entryData.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEntryData({
                    ...entryData,
                    address: e.target.value,
                  })
                }
                onAddressSelect={(data: AddressData) => {
                  const updated = {
                    ...entryData,
                    address: data.formattedAddress,
                    lat: data.lat,
                    lng: data.lng,
                  };
                  addStop(updated);
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
                {dict.shipments.dialogs.fields.contactEmail || "CONTACT EMAIL"}
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
  );
};
