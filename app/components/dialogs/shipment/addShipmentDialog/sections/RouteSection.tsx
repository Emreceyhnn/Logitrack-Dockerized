import {
  Box,
  Button,
  Grid,
  Stack,
  Typography,
  MenuItem,
  Card,
} from "@mui/material";
import { useFormikContext } from "formik";
import { ShipmentFormValues } from "@/app/lib/type/shipment";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import { RouteWithRelations } from "@/app/lib/type/routes";
import RouteIcon from "@mui/icons-material/Route";
import PersonIcon from "@mui/icons-material/Person";
import EventIcon from "@mui/icons-material/Event";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayTime } from "@/app/lib/utils/date";

interface RouteSectionProps {
  routes: RouteWithRelations[];
}

const RouteSection = ({ routes }: RouteSectionProps) => {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();
  const dateSettings = useDateSettings();

  const { values, setFieldValue, handleBlur, touched, errors } =
    useFormikContext<ShipmentFormValues>();

  const selectedRoute = routes.find((r) => r.id === values.assignedRouteId);

  return (
    <Box>
      <Stack spacing={2.5}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
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
              {dict.shipments.dialogs.sections.routeManagement}
            </Typography>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {}}
            sx={{
              color: "primary.main",
              borderColor: (theme) => theme.palette.primary._alpha.main_30,
              fontWeight: 600,
              textTransform: "none",
              borderRadius: 2,
            }}
          >
            {dict.shipments.dialogs.buttons.assignToExistingRoute}
          </Button>
        </Stack>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.shipments.dialogs.fields.routeId}
              </Typography>
              <CustomTextArea
                name="assignedRouteId"
                select
                placeholder={dict.shipments.dialogs.fields.routePlaceholder}
                value={values.assignedRouteId || ""}
                onBlur={handleBlur}
                error={
                  touched.assignedRouteId && Boolean(errors.assignedRouteId)
                }
                helperText={
                  touched.assignedRouteId
                    ? (errors.assignedRouteId as string)
                    : undefined
                }
                onChange={(e) =>
                  setFieldValue("assignedRouteId", e.target.value)
                }
              >
                <MenuItem value="">
                  {dict.shipments.dialogs.fields.unassigned}
                </MenuItem>
                {routes.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <RouteIcon
                        sx={{ fontSize: 18, color: "text.secondary" }}
                      />
                      <Typography variant="body2">
                        {r.name || `Route ${r.id.slice(0, 8)}`}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </CustomTextArea>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            {selectedRoute ? (
              <Card
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: (theme) =>
                    theme.palette.text.darkBlue._alpha.main_50,
                  border: (theme) =>
                    `1px solid ${theme.palette.divider_alpha.main_10}`,
                  backgroundImage: "none",
                }}
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Stack spacing={0.5}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                      >
                        {dict.shipments.dialogs.fields.assignedDriver}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PersonIcon
                          sx={{
                            fontSize: 16,
                            color: "primary.main",
                          }}
                        />
                        <Typography
                          variant="body2"
                          color="white"
                          fontWeight={500}
                        >
                          {selectedRoute.driver?.user.name}{" "}
                          {selectedRoute.driver?.user.surname || "Unassigned"}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Stack spacing={0.5}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                      >
                        {dict.shipments.dialogs.fields.estDeparture}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <EventIcon
                          sx={{ fontSize: 16, color: "text.secondary" }}
                        />
                        <Typography variant="body2" color="white">
                          {selectedRoute.startTime
                            ? formatDisplayTime(
                                selectedRoute.startTime,
                                dateSettings
                              )
                            : dict.shipments.dialogs.fields.pendingAssignment}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Grid>
                </Grid>
              </Card>
            ) : (
              <Box
                sx={{
                  p: 2,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 2,
                  bgcolor: (theme) => theme.palette.divider_alpha.main_02,
                  border: (theme) =>
                    `1px dashed ${theme.palette.divider_alpha.main_10}`,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {dict.shipments.dialogs.fields.readOnlyPreview}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default RouteSection;
