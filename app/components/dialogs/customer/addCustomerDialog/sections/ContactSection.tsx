import {
  Box,
  Button,
  Grid,
  IconButton,
  Stack,
  Typography,
  SvgIconProps,
} from "@mui/material";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import { AddressAutocomplete } from "@/app/components/googleMaps/AddressAutocomplete";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import MapIcon from "@mui/icons-material/Map";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ExploreIcon from "@mui/icons-material/Explore";
import { useFormikContext, FieldArray, getIn } from "formik";
import {
  CustomerFormValues,
  CustomerFormLocation,
} from "@/app/lib/type/customer";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

const LabelWithIcon = ({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<SvgIconProps>;
  label: string;
}) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
    <Icon sx={{ fontSize: "0.9rem", color: "primary.main", opacity: 0.8 }} />
    <Typography
      variant="caption"
      color="text.secondary"
      fontWeight={700}
      sx={{ letterSpacing: "0.05em", textTransform: "uppercase" }}
    >
      {label}
    </Typography>
  </Stack>
);

const ContactSection = () => {
  const dict = useDictionary();
  const { values, errors, touched, setFieldValue, handleBlur } =
    useFormikContext<CustomerFormValues>();

  return (
    <Box sx={{ py: 1 }}>
      <Stack spacing={4}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={0}>
              <LabelWithIcon
                icon={EmailIcon}
                label={dict.customers.primaryEmail}
              />
              <CustomTextArea
                name="email"
                placeholder={dict.common.na}
                value={values.email}
                onChange={(e) => setFieldValue("email", e.target.value)}
                onBlur={handleBlur}
                error={touched.email && Boolean(errors.email)}
                helperText={touched.email ? (errors.email as string) : ""}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "theme.palette.common.white_alpha.main_02",
                  },
                }}
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={0}>
              <LabelWithIcon
                icon={PhoneIcon}
                label={dict.customers.phoneNumber}
              />
              <CustomTextArea
                name="phone"
                placeholder={dict.common.na}
                value={values.phone}
                onChange={(e) => setFieldValue("phone", e.target.value)}
                onBlur={handleBlur}
                error={touched.phone && Boolean(errors.phone)}
                helperText={touched.phone ? (errors.phone as string) : ""}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "theme.palette.common.white_alpha.main_02",
                  },
                }}
              />
            </Stack>
          </Grid>
        </Grid>

        <FieldArray name="locations">
          {({ push, remove }) => (
            <>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-end"
              >
                <Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    color="white"
                  >
                    {dict.customers.operatingLocations}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={500}
                  >
                    {dict.customers.addOfficesHubs}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() =>
                    push({
                      name: `${dict.customers.fields.name} ${values.locations.length + 1}`,
                      address: "",
                      lat: undefined,
                      lng: undefined,
                      isDefault: values.locations.length === 0,
                    })
                  }
                  sx={{
                    borderColor: "theme.palette.primary._alpha.main_30",
                    color: "primary.main",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "theme.palette.primary._alpha.main_05",
                    },
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    px: 2,
                  }}
                >
                  {dict.customers.addLocation}
                </Button>
              </Stack>

              <Stack spacing={3}>
                {values.locations.map(
                  (loc: CustomerFormLocation, index: number) => {
                    const locErrors = getIn(errors, `locations[${index}]`);
                    const locTouched = getIn(touched, `locations[${index}]`);

                    return (
                      <Box
                        key={index}
                        sx={{
                          p: 3,
                          borderRadius: 4,
                          border: `1px solid theme.palette.common.white_alpha.main_05`,
                          bgcolor: "theme.palette.common.white_alpha.main_01",
                          backgroundImage: `linear-gradient(135deg, theme.palette.common.white_alpha.main_02 0%, transparent 100%)`,
                          position: "relative",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            border: `1px solid theme.palette.primary._alpha.main_20`,
                            bgcolor: "theme.palette.common.white_alpha.main_02",
                          },
                        }}
                      >
                        {values.locations.length > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              remove(index);
                              if (
                                loc.isDefault &&
                                values.locations.length > 1
                              ) {
                                const nextIdx = index === 0 ? 1 : 0;
                                setFieldValue(
                                  `locations[${nextIdx}].isDefault`,
                                  true
                                );
                              }
                            }}
                            sx={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              color: "theme.palette.error._alpha.main_50",
                              bgcolor: "theme.palette.error._alpha.main_05",
                              "&:hover": {
                                color: "error.main",
                                bgcolor: "theme.palette.error._alpha.main_10",
                              },
                            }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        )}

                        <Grid container spacing={3}>
                          <Grid size={{ xs: 12, md: 5 }}>
                            <Stack spacing={0}>
                              <LabelWithIcon
                                icon={MapIcon}
                                label={dict.customers.fields.name}
                              />
                              <CustomTextArea
                                name={`locations[${index}].name`}
                                placeholder={dict.common.na}
                                value={loc.name}
                                onChange={(e) =>
                                  setFieldValue(
                                    `locations[${index}].name`,
                                    e.target.value
                                  )
                                }
                                onBlur={handleBlur}
                                error={
                                  locTouched?.name && Boolean(locErrors?.name)
                                }
                                helperText={
                                  locTouched?.name ? locErrors?.name : ""
                                }
                              />
                            </Stack>
                          </Grid>
                          <Grid size={{ xs: 12, md: 7 }}>
                            <Stack spacing={0}>
                              <LabelWithIcon
                                icon={LocationOnIcon}
                                label={dict.customers.fields.address}
                              />
                              <AddressAutocomplete
                                name={`locations[${index}].address`}
                                placeholder={dict.common.na}
                                value={loc.address}
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>
                                ) =>
                                  setFieldValue(
                                    `locations[${index}].address`,
                                    e.target.value
                                  )
                                }
                                onBlur={handleBlur}
                                error={
                                  locTouched?.address &&
                                  Boolean(locErrors?.address)
                                }
                                helperText={
                                  locTouched?.address ? locErrors?.address : ""
                                }
                                onAddressSelect={(data: {
                                  formattedAddress: string;
                                  lat: number;
                                  lng: number;
                                }) => {
                                  setFieldValue(
                                    `locations[${index}].address`,
                                    data.formattedAddress
                                  );
                                  setFieldValue(
                                    `locations[${index}].lat`,
                                    data.lat
                                  );
                                  setFieldValue(
                                    `locations[${index}].lng`,
                                    data.lng
                                  );
                                }}
                              />
                            </Stack>
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Stack spacing={0}>
                              <LabelWithIcon
                                icon={ExploreIcon}
                                label={dict.customers.fields.lat}
                              />
                              <CustomTextArea
                                name={`locations[${index}].lat`}
                                placeholder={dict.common.na}
                                value={
                                  loc.lat !== undefined ? String(loc.lat) : ""
                                }
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setFieldValue(
                                    `locations[${index}].lat`,
                                    isNaN(val) ? undefined : val
                                  );
                                }}
                                onBlur={handleBlur}
                              />
                            </Stack>
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Stack spacing={0}>
                              <LabelWithIcon
                                icon={ExploreIcon}
                                label={dict.customers.fields.lng}
                              />
                              <CustomTextArea
                                name={`locations[${index}].lng`}
                                placeholder={dict.common.na}
                                value={
                                  loc.lng !== undefined ? String(loc.lng) : ""
                                }
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setFieldValue(
                                    `locations[${index}].lng`,
                                    isNaN(val) ? undefined : val
                                  );
                                }}
                                onBlur={handleBlur}
                              />
                            </Stack>
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  }
                )}
              </Stack>
            </>
          )}
        </FieldArray>
      </Stack>
    </Box>
  );
};

export default ContactSection;
