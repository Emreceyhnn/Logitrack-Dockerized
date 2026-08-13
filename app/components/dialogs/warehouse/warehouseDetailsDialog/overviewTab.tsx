"use client";

import { Box, Grid } from "@mui/material";
import { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import TopInfoCards from "./sections/TopInfoCards";
import CapacityUtilization from "./sections/CapacityUtilization";
import FacilityCapabilities from "./sections/FacilityCapabilities";

interface OverviewTabProps {
  warehouse: WarehouseWithRelations;
}

const OverviewTab = ({ warehouse }: OverviewTabProps) => {
  return (
    <Box>
      <Grid container spacing={4}>
        <TopInfoCards warehouse={warehouse} />
        <CapacityUtilization warehouse={warehouse} />
        <FacilityCapabilities warehouse={warehouse} />
      </Grid>
    </Box>
  );
};

export default OverviewTab;
