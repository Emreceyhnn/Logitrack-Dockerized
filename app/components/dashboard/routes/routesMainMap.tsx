"use client";

import { useMemo } from "react";
import { Box, Skeleton } from "@mui/material";
import { MapRouteData } from "@/app/lib/type/routes";
import dynamic from "next/dynamic";
const MapWithMarkers = dynamic(() => import("../../valhalla/mapWithMarker"), {
  ssr: false,
});

interface RoutesMainMapProps {
  mapData: MapRouteData[];
  loading?: boolean;
}

const RoutesMainMap = ({ mapData, loading }: RoutesMainMapProps) => {
  const markers = useMemo(() => {
    return mapData.map((v) => {
      return {
        id: v.id,
        lat: v.position.lat,
        len: v.position.lng,
        name: v.name,
        type: v.type as string,
      };
    });
  }, [mapData]);

  return (
    <Box
      sx={{
        minHeight: 400,
        flexGrow: 3,
        borderRadius: "16px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 10,
          }}
        >
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            sx={{ minHeight: 400 }}
          />
        </Box>
      )}
      <Box sx={{ width: "100%", height: "100%" }}>
        <MapWithMarkers markers={markers} />
      </Box>
    </Box>
  );
};

export default RoutesMainMap;
