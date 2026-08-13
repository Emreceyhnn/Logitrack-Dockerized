"use client";

import { Box, Grid, Stack, Typography, useTheme } from "@mui/material";
import { useFormikContext } from "formik";
import { RouteFormValues } from "@/app/lib/type/routes";
import ExploreIcon from "@mui/icons-material/Explore";
import { useEffect, useMemo, useState } from "react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { polylineHelper, PolylineHelperResult } from "../../../valhalla/polylineHelper";
import { logger } from "@/app/lib/logger";

import RouteAddressForm from "./sections/RouteAddressForm";
import RouteMapPanel from "./sections/RouteMapPanel";

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
}

const SecondRouteDialogStep = () => {
  const theme = useTheme();
  const dict = useDictionary();
  const { values, setFieldValue, touched, errors } = useFormikContext<RouteFormValues>();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;

  const [data, setData] = useState<PolylineHelperResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const waypointsStr = useMemo(() => {
    const stops = values?.stops || [];
    const points = stops.filter((i) => i.lat && i.lng).map((i) => ({ name: i.address || "Durak", lat: Number(i.lat), lon: Number(i.lng) }));
    return JSON.stringify(points);
  }, [values.stops]);

  useEffect(() => {
    const waypoints = JSON.parse(waypointsStr);
    if (waypoints.length < 2) {
      setData(null);
      setIsLoading(false);
      return;
    }

    // Shown from the same commit that starts the request, so editing a stop
    // never leaves the map bare while a fetch is in flight.
    setIsLoading(true);

    // Stops change fast while the user edits them; without this an earlier,
    // slower response could overwrite the distance/shape of a later one.
    let cancelled = false;

    (async () => {
      try {
        const response = await polylineHelper({ locations: waypoints, costing: "truck" });
        if (cancelled) return;

        setData(response ?? null);
        if (response?.summary) {
          setFieldValue("distanceKm", response.summary.length || 0);
          setFieldValue("durationMin", Math.round((response.summary.time || 0) / 60));
          setFieldValue("shape", response.shape || "");
        }
      } catch (error) {
        if (!cancelled) logger.error("Valhalla API Error:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [waypointsStr, setFieldValue]);

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={2.5}>
        <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: paletteTheme.primary?._alpha?.main_10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ExploreIcon color="primary" fontSize="small" />
        </Box>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" fontWeight={700} color="white">{dict.routes.dialogs.locationDetails}</Typography>
          <Typography variant="caption" color="text.secondary">{dict.routes.dialogs.locationDetailsDesc}</Typography>
        </Stack>
      </Stack>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <Box sx={{ pr: { xs: 0, md: 1 }, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <RouteAddressForm
              values={values}
              setFieldValue={setFieldValue}
              touched={touched}
              errors={errors}
              dict={dict}
              bufferError={touched.bufferMeters ? (errors.bufferMeters as string | undefined) : undefined}
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <RouteMapPanel
            values={values}
            data={data}
            dict={dict}
            isLoading={isLoading}
            bufferError={touched.bufferMeters ? (errors.bufferMeters as string | undefined) : undefined}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default SecondRouteDialogStep;
