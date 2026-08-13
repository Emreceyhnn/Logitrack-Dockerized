import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Stack,
  InputAdornment,
} from "@mui/material";
import ScaleIcon from "@mui/icons-material/Scale";
import OpacityIcon from "@mui/icons-material/Opacity";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useFormikContext } from "formik";
import { VehicleFormValues } from "@/app/lib/type/vehicle";

const TechSpecsStep = () => {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();
  const { values, errors, touched, handleBlur, handleChange } =
    useFormikContext<VehicleFormValues>();

  /* --------------------------------- styles --------------------------------- */
  const textFieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      "& fieldset": {
        borderColor: "divider",
      },
      "&:hover fieldset": {
        borderColor: "primary.main",
      },
    },
    "& .MuiInputLabel-root": {
      fontSize: "0.85rem",
    },
    "& .MuiOutlinedInput-input": {
      fontSize: "0.9rem",
    },
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Stack direction="row" spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            color="text.secondary"
            mb={1}
          >
            {dict.vehicles.fields.capacity}
          </Typography>
          <TextField
            fullWidth
            name="maxLoadKg"
            type="number"
            placeholder="0"
            value={values.maxLoadKg}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.maxLoadKg && Boolean(errors.maxLoadKg)}
            helperText={touched.maxLoadKg && (errors.maxLoadKg as string)}
            sx={textFieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <ScaleIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="body2" color="text.secondary">
                    kg
                  </Typography>
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            color="text.secondary"
            mb={1}
          >
            {dict.vehicles.fields.fuelType}
          </Typography>
          <TextField
            fullWidth
            select
            name="fuelType"
            value={values.fuelType}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.fuelType && Boolean(errors.fuelType)}
            helperText={touched.fuelType && (errors.fuelType as string)}
            sx={textFieldSx}
          >
            <MenuItem value="">{dict.common.search}</MenuItem>
            <MenuItem value="DIESEL">{dict.vehicles.fuelTypes.DIESEL}</MenuItem>
            <MenuItem value="GASOLINE">
              {dict.vehicles.fuelTypes.GASOLINE}
            </MenuItem>
            <MenuItem value="ELECTRIC">
              {dict.vehicles.fuelTypes.ELECTRIC}
            </MenuItem>
            <MenuItem value="HYBRID">{dict.vehicles.fuelTypes.HYBRID}</MenuItem>
          </TextField>
        </Box>
      </Stack>
      <Stack direction="row" spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            color="text.secondary"
            mb={1}
          >
            {dict.vehicles.fields.fuelCapacity || "Fuel Capacity"}
          </Typography>
          <TextField
            fullWidth
            name="fuelCapacity"
            type="number"
            placeholder="130"
            value={values.fuelCapacity}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.fuelCapacity && Boolean(errors.fuelCapacity)}
            helperText={touched.fuelCapacity && (errors.fuelCapacity as string)}
            sx={textFieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocalGasStationIcon
                    sx={{ fontSize: 20, color: "text.secondary" }}
                  />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="body2" color="text.secondary">
                    L
                  </Typography>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            color="text.secondary"
            mb={1}
          >
            {dict.vehicles.fields.avgFuelConsumption}
          </Typography>
          <TextField
            fullWidth
            name="avgFuelConsumption"
            type="number"
            placeholder="e.g. 12.5"
            value={values.avgFuelConsumption}
            onChange={handleChange}
            onBlur={handleBlur}
            error={
              touched.avgFuelConsumption && Boolean(errors.avgFuelConsumption)
            }
            helperText={
              touched.avgFuelConsumption &&
              (errors.avgFuelConsumption as string)
            }
            sx={textFieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <OpacityIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="body2" color="text.secondary">
                    L/100km
                  </Typography>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Stack>

      <Stack direction="row" spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            color="text.secondary"
            mb={1}
          >
            {dict.vehicles.fields.engineSize}
          </Typography>
          <TextField
            fullWidth
            name="engineSize"
            placeholder="e.g. 4.0L V8"
            value={values.engineSize}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.engineSize && Boolean(errors.engineSize)}
            helperText={touched.engineSize && (errors.engineSize as string)}
            sx={textFieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SettingsIcon
                    sx={{ fontSize: 20, color: "text.secondary" }}
                  />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            color="text.secondary"
            mb={1}
          >
            {dict.vehicles.fields.transmission || "Transmission"}
          </Typography>
          <TextField
            fullWidth
            select
            name="transmission"
            value={values.transmission}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.transmission && Boolean(errors.transmission)}
            helperText={touched.transmission && (errors.transmission as string)}
            sx={textFieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <TuneIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          >
            <MenuItem value="">{dict.common.search}</MenuItem>
            <MenuItem value="AUTOMATIC">
              {dict.vehicles.transmissionTypes.AUTOMATIC}
            </MenuItem>
            <MenuItem value="MANUAL">
              {dict.vehicles.transmissionTypes.MANUAL}
            </MenuItem>
            <MenuItem value="AMULTI">
              {dict.vehicles.transmissionTypes.AMULTI}
            </MenuItem>
          </TextField>
        </Box>
      </Stack>

      <Box>
        <Typography
          variant="subtitle2"
          fontWeight={600}
          color="text.secondary"
          mb={1}
        >
          {dict.vehicles.fields.techNotes}
        </Typography>
        <TextField
          fullWidth
          multiline
          name="techNotes"
          rows={3}
          placeholder="..."
          value={values.techNotes}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.techNotes && Boolean(errors.techNotes)}
          helperText={touched.techNotes && (errors.techNotes as string)}
          sx={{
            ...textFieldSx,
            "& .MuiOutlinedInput-root": {
              ...textFieldSx["& .MuiOutlinedInput-root"],
              padding: "12px",
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default TechSpecsStep;
