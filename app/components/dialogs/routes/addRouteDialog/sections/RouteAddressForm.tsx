import { Box, Stack, Typography, IconButton, Button, TextField, InputAdornment, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RadarIcon from "@mui/icons-material/Radar";
import { AddressAutocomplete } from "@/app/components/googleMaps/AddressAutocomplete";
import { Dictionary } from "@/app/lib/language/language";
import { FormikErrors, FormikTouched } from "formik";
import { RouteFormValues } from "@/app/lib/type/routes";
import {
  DEFAULT_ROUTE_BUFFER_METERS,
  MIN_ROUTE_BUFFER_METERS,
  MAX_ROUTE_BUFFER_METERS,
} from "@/app/lib/type/routeDeviation";

interface ExtendedPalette {
  divider_alpha?: Record<string, string>;
  warning?: {
    _alpha?: Record<string, string>;
  };
}

interface RouteAddressFormProps {
  values: RouteFormValues;
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  touched: FormikTouched<RouteFormValues>;
  errors: FormikErrors<RouteFormValues>;
  dict: Dictionary;
  bufferError?: string | undefined;
}

interface AddressSelectPayload {
  lat: number;
  lng: number;
  formattedAddress: string;
}

// One address block is ~84px tall plus the 20px stack gap. Three of them is the
// cap; the list also flex-shrinks below this so a fourth stop scrolls inside the
// list instead of growing the column and pushing the map down.
const ADDRESS_BLOCK_HEIGHT = 80;
const ADDRESS_BLOCK_GAP = 20;
const VISIBLE_ADDRESS_BLOCKS = 3;
const ADDRESS_LIST_MAX_HEIGHT =
  VISIBLE_ADDRESS_BLOCKS * ADDRESS_BLOCK_HEIGHT + (VISIBLE_ADDRESS_BLOCKS - 1) * ADDRESS_BLOCK_GAP;

export default function RouteAddressForm({ values, setFieldValue, touched, errors, dict, bufferError }: RouteAddressFormProps) {
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  // The corridor is only meaningful once the engine has returned a shape.
  const hasShape = Boolean(values.shape);
  const intermediateStops = values.stops && values.stops.length > 2 ? values.stops.slice(1, values.stops.length - 1) : [];

  // space-between pins the deviation box to the bottom of the column so its
  // lower edge stays level with the map's, whatever the stop count is.
  return (
    <Stack sx={{ height: "100%", minHeight: 0, justifyContent: "space-between" }}>
      <Stack
        spacing={2}
        sx={{
          // `flex` (not just maxHeight) so the list gives up height to the button
          // and deviation box when the dialog is short, instead of overflowing.
          flex: "0 1 auto",
          minHeight: 0,
        }}
      >
        <Stack
          spacing={2.5}
          sx={{
            flex: "0 1 auto",
            minHeight: 0,
            maxHeight: ADDRESS_LIST_MAX_HEIGHT,
            overflowY: "auto",
            pr: 1,
            // Keeps focus rings and helper text from being clipped by the scroller.
            pb: 0.5,
          }}
        >
        <Stack spacing={1}>
          <Typography variant="body2" component="div" fontWeight={600} color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} />
            {dict.routes.dialogs.startAddress}
          </Typography>
          <AddressAutocomplete
            value={values.stops?.[0]?.address}
            onAddressSelect={({ lat, lng, formattedAddress }: AddressSelectPayload) => {
              setFieldValue("startAddress", formattedAddress); setFieldValue("startLat", lat); setFieldValue("startLng", lng);
              const newStops = [...(values.stops || [])];
              if (newStops.length > 0) newStops[0] = { address: formattedAddress, lat, lng }; else newStops.push({ address: formattedAddress, lat, lng });
              setFieldValue("stops", newStops);
            }}
            error={touched.startAddress && Boolean(errors.startAddress)} helperText={touched.startAddress ? (errors.startAddress as string) : undefined}
          />
        </Stack>

        {intermediateStops.map((stop: { address?: string }, index: number) => {
          const actualIndex = index + 1;
          return (
            <Stack spacing={1} key={actualIndex}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" component="div" fontWeight={600} color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main" }} /> Stop {actualIndex}
                </Typography>
                <IconButton size="small" color="error" onClick={() => { const newStops = [...(values.stops || [])]; newStops.splice(actualIndex, 1); setFieldValue("stops", newStops); }}><CloseIcon fontSize="small" /></IconButton>
              </Stack>
              <AddressAutocomplete
                value={stop.address}
                onAddressSelect={({ lat, lng, formattedAddress }: AddressSelectPayload) => { setFieldValue(`stops[${actualIndex}]`, { address: formattedAddress, lat, lng }); }}
              />
            </Stack>
          );
        })}

        <Stack spacing={1}>
          <Typography variant="body2" component="div" fontWeight={600} color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "error.main" }} />
            {dict.routes.dialogs.endAddress}
          </Typography>
          <AddressAutocomplete
            value={values.endAddress}
            onAddressSelect={({ lat, lng, formattedAddress }: AddressSelectPayload) => {
              setFieldValue("endAddress", formattedAddress); setFieldValue("endLat", lat); setFieldValue("endLng", lng);
              const newStops = [...(values.stops || [])];
              if (newStops.length > 1) newStops[newStops.length - 1] = { address: formattedAddress, lat, lng }; else if (newStops.length === 1) newStops.push({ address: formattedAddress, lat, lng }); else { newStops.push({ address: "", lat: 0, lng: 0 }); newStops.push({ address: formattedAddress, lat, lng }); }
              setFieldValue("stops", newStops);
            }}
            error={touched.endAddress && Boolean(errors.endAddress)} helperText={touched.endAddress ? (errors.endAddress as string) : undefined}
          />
        </Stack>
      </Stack>

      <Button
        variant="outlined" size="small" color="inherit"
        onClick={() => {
          const newStops = [...(values.stops || [])];
          if (newStops.length >= 2) newStops.splice(newStops.length - 1, 0, { address: "", lat: 0, lng: 0 });
          else { while (newStops.length < 2) { newStops.push({ address: "", lat: 0, lng: 0 }); } newStops.splice(1, 0, { address: "", lat: 0, lng: 0 }); }
          setFieldValue("stops", newStops);
        }}
        sx={{ alignSelf: "flex-start", flexShrink: 0 }}
      >
        + Add Stop
      </Button>
      </Stack>

      <Box
        sx={{
          p: 1.75,
          mt: 2,
          borderRadius: 2,
          flexShrink: 0,
          bgcolor: paletteTheme.warning?._alpha?.main_05,
          border: `1px solid ${paletteTheme.warning?._alpha?.main_10}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{ minWidth: 0 }}>
          <RadarIcon fontSize="small" sx={{ color: theme.palette.warning.main, flexShrink: 0, mt: "1px" }} />
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} color="warning.main" sx={{ lineHeight: 1.3 }}>
              {dict.routes.dialogs.deviationTitle}
            </Typography>
            {/* The error takes the description's slot so the box height — and
                therefore the column's bottom edge — never shifts. */}
            <Typography
              variant="caption"
              color={bufferError ? "error" : "text.secondary"}
              sx={{ lineHeight: 1.3 }}
            >
              {bufferError || (hasShape ? dict.routes.dialogs.deviationDesc : dict.routes.dialogs.deviationDisabledHint)}
            </Typography>
          </Stack>
        </Stack>
        <TextField
          type="number"
          size="small"
          disabled={!hasShape}
          value={values.bufferMeters ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            setFieldValue("bufferMeters", raw === "" ? undefined : Number(raw));
          }}
          placeholder={String(DEFAULT_ROUTE_BUFFER_METERS)}
          error={Boolean(bufferError)}
          slotProps={{
            htmlInput: {
              min: MIN_ROUTE_BUFFER_METERS,
              max: MAX_ROUTE_BUFFER_METERS,
              step: 50,
              "aria-label": dict.routes.dialogs.deviationTitle,
            },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    m
                  </Typography>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            width: 104,
            flexShrink: 0,
            // Mirrors AddressAutocomplete's field styling so the two controls in
            // this column read as the same input family.
            "& .MuiOutlinedInput-root": {
              height: 40,
              borderRadius: "0.5rem",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              pr: 1.25,
              fontSize: "0.875rem",
              "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
              "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
              "&.Mui-focused fieldset": { borderColor: theme.palette.warning.main, borderWidth: 1 },
              "&.Mui-disabled": { opacity: 0.5 },
            },
            "& .MuiOutlinedInput-input": { py: 0, pl: 1.25, pr: 0.5, fontWeight: 600 },
            // The spinners crowd a field this narrow.
            "& input[type=number]": { MozAppearance: "textfield" },
            "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
              WebkitAppearance: "none",
              margin: 0,
            },
          }}
        />
      </Box>
    </Stack>
  );
}
