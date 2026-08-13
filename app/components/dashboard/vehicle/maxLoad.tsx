import CustomCard from "../../cards/card";
import { Divider, Stack, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import AnalyticsSkeleton from "@/app/components/skeletons/AnalyticsSkeleton";

interface VehicleCapacityChartProps {
  data: {
    id: string;
    plate: string;
    maxLoadKg: number;
  }[];
  loading?: boolean;
}

import { useDictionary } from "@/app/lib/language/DictionaryContext";

const VehicleCapacityChart = ({
  data,
  loading = false,
}: VehicleCapacityChartProps) => {
  const dict = useDictionary();
  const sortedData = data.sort((a, b) => a.maxLoadKg - b.maxLoadKg);

  if (loading || !data) {
    return (
      <AnalyticsSkeleton
        title={dict.vehicles.dashboard.maxLoadCapacity}
        height={270}
        showSubtitle={false}
      />
    );
  }

  return (
    <CustomCard sx={{ padding: "0 0 6px 0", flexGrow: 1 }}>
      <Typography sx={{ fontSize: 18, fontWeight: 600, p: 2 }}>
        {dict.vehicles.dashboard.maxLoadCapacity}
      </Typography>
      <Divider />
      <Stack>
        <BarChart
          height={350}
          xAxis={[
            {
              scaleType: "band",
              data: sortedData?.map((v) => v.plate),
              label: dict.vehicles.dashboard.vehiclePlate,

              labelStyle: { fill: "#6b7280" },
            },
          ]}
          yAxis={[
            {
              id: "primary",
              label: dict.vehicles.dashboard.capacityUnits,
              min: 0,
              max: 100,
            },

            {
              id: "secondary",
              label: dict.vehicles.dashboard.maxWeightKg,
              position: "right",
              min: 0,
              max: 25000,
            },
          ]}
          series={[
            {
              yAxisId: "secondary",
              label: dict.vehicles.dashboard.maxWeightKg,
              data: sortedData?.map((v) => v.maxLoadKg),
              color: "#ff9800",
            },
          ]}
          slotProps={{
            legend: {
              direction: "horizontal",
              position: { vertical: "bottom", horizontal: "center" },
            },
          }}
        />
      </Stack>
    </CustomCard>
  );
};

export default VehicleCapacityChart;
