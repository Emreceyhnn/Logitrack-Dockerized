import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Stack,
} from "@mui/material";
import { RouteWithRelations } from "@/app/lib/type/routes";
import CircleIcon from "@mui/icons-material/Circle";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayTime } from "@/app/lib/utils/date";

export default function RouteProgress({
  route,
}: {
  route: RouteWithRelations;
}) {
  const dict = useDictionary();
  const dateSettings = useDateSettings();

  const routeStops = (Array.isArray(route.stops) ? route.stops : []) as {
    address?: string;
  }[];
  const lastIndex = routeStops.length - 1;

  const stops = routeStops.map((stop, index) => {
    const isFirst = index === 0;
    const isLast = index === lastIndex;

    let locationName: string;
    if (isFirst) {
      locationName = stop.address || dict.routes.details.origin;
    } else if (isLast) {
      locationName = stop.address || dict.routes.details.destination;
    } else {
      locationName = `${dict.routes.details.delivery}: ${stop.address || "-"}`;
    }

    let status: string;
    let time: string;
    if (isFirst) {
      status = "COMPLETED";
      time = formatDisplayTime(route.startTime, dateSettings);
    } else if (isLast) {
      status = route.status === "COMPLETED" ? "COMPLETED" : "PENDING";
      time = formatDisplayTime(route.endTime, dateSettings);
    } else {
      status = route.status === "COMPLETED" ? "COMPLETED" : "PENDING";
      time = "-";
    }

    return { locationName, status, time };
  });

  const activeStep = stops.findIndex((s) => s.status === "PENDING");
  const currentStep = activeStep === -1 ? stops.length : activeStep;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        maxHeight: 500,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} mb={2} color="white">
        {dict.routes.details.liveProgress}
      </Typography>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          maxHeight: 220, // Shows at least 3-4 items, scrolls if more
          overflowY: "auto",
          pr: 1,
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 3,
          },
        }}
      >
        <Stepper activeStep={currentStep} orientation="vertical">
          {stops.map((step, index) => (
            <Step key={index} expanded={true}>
              <StepLabel
                StepIconComponent={() => (
                  <CircleIcon
                    sx={{
                      fontSize: 12,
                      color:
                        index <= currentStep ? "primary.main" : "text.disabled",
                    }}
                  />
                )}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  width="100%"
                >
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    color={index <= currentStep ? "white" : "text.secondary"}
                  >
                    {step.locationName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.time}
                  </Typography>
                </Stack>
              </StepLabel>
              <StepContent>
                <Box sx={{ height: 10 }} />
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Box>
    </Box>
  );
}
