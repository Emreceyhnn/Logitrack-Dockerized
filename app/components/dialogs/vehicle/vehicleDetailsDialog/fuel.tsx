"use client";

import {
  Box,
  Button,
  Card,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
  useTheme,
} from "@mui/material";
import { VehicleWithRelations } from "@/app/lib/type/vehicle";
import AddIcon from "@mui/icons-material/Add";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import { useState } from "react";
import AddFuelLogDialog from "../fuelLogDialog";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useCurrency } from "@/app/hooks/useCurrency";
import dayjs from "dayjs";

interface FuelTabProps {
  vehicle?: VehicleWithRelations;
  onUpdate?: () => void;
}

const FuelTab = ({ vehicle, onUpdate }: FuelTabProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const { formatFrom, convertFrom, currency } = useCurrency();
  const [addFuelDialogOpen, setAddFuelDialogOpen] = useState(false);

  if (!vehicle) {
    return <Typography color="text.secondary">{dict.common.noData}</Typography>;
  }

  const fuelHistory = (vehicle.fuelLogs || []).slice(0, 10);

  const totalFuelCost = (vehicle.fuelLogs || []).reduce(
    (sum, log) => sum + convertFrom(Number(log.cost), log.currency || "USD"),
    0
  );
  const totalVolume = (vehicle.fuelLogs || []).reduce(
    (sum, log) => sum + log.volumeLiter,
    0
  );

  return (
    <Stack spacing={2} maxHeight={750}>
      <Stack spacing={2} direction={"row"} justifyContent={"space-between"}>
        <Card
          sx={{
            p: 2,
            flex: 1,
            gap: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: "8px",
            justifyContent: "space-evenly",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.02)",
            backgroundImage: "none",
            boxShadow: "none",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            sx={{ fontSize: 14, fontWeight: 500, color: "text.secondary" }}
          >
            {dict.fuel.fields.volume}
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {totalVolume.toFixed(2)} L
          </Typography>
        </Card>

        <Card
          sx={{
            p: 2,
            flex: 1,
            gap: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: "8px",
            justifyContent: "space-evenly",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.02)",
            backgroundImage: "none",
            boxShadow: "none",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            sx={{ fontSize: 14, fontWeight: 500, color: "text.secondary" }}
          >
            {dict.fuel.fields.cost}
          </Typography>
          <Typography variant="h5" fontWeight={800} color="primary.main">
            {formatFrom(totalFuelCost, currency)}
          </Typography>
        </Card>

        <Card
          sx={{
            p: 2,
            flex: 1,
            gap: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: "8px",
            justifyContent: "space-evenly",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.02)",
            backgroundImage: "none",
            boxShadow: "none",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            sx={{ fontSize: 14, fontWeight: 500, color: "text.secondary" }}
          >
            {dict.vehicles.specs.avgFuelConsumption}
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {vehicle.avgFuelConsumption || "N/A"}{" "}
            <Typography component="span" variant="caption">
              L/100km
            </Typography>
          </Typography>
        </Card>
      </Stack>

      <Card
        sx={{
          borderRadius: "12px",
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
          backgroundImage: "none",
          boxShadow: "none",
          overflow: "hidden",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            p: 2,
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.02)"
                : "rgba(0,0,0,0.01)",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                p: 1,
                borderRadius: "10px",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "primary._alpha.main_10"
                    : "primary._alpha.main_05",
                color: "primary.main",
                display: "flex",
              }}
            >
              <LocalGasStationIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>
                {dict.fuel.history}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dict.fuel.addLogDesc}
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAddFuelDialogOpen(true)}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
              "&:hover": { boxShadow: "none" },
            }}
          >
            {dict.fuel.addLog}
          </Button>
        </Stack>

        <Divider />

        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, py: 2 }}>
                  {dict.fuel.fields.date}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, py: 2 }}>
                  {dict.fuel.fields.fuelType}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, py: 2 }}>
                  {dict.fuel.fields.volume}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, py: 2 }}>
                  {dict.fuel.fields.cost}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, py: 2 }}>
                  {dict.fuel.fields.odometer}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, py: 2 }}>
                  {dict.fuel.fields.location}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fuelHistory.length > 0 ? (
                fuelHistory.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ py: 1.5 }}>
                      {dayjs(log.date).format("DD MMM YYYY")}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {dict.vehicles.fuelTypes[
                          log.fuelType as keyof typeof dict.vehicles.fuelTypes
                        ] || log.fuelType}
                      </Typography>
                    </TableCell>
                    <TableCell>{log.volumeLiter} L</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "primary.main" }}>
                      {formatFrom(log.cost, log.currency || "USD")}
                    </TableCell>
                    <TableCell>{log.odometerKm.toLocaleString("en-US")} km</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {log.location || "-"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Typography variant="body2" color="text.secondary">
                      {dict.fuel.noLogs}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <AddFuelLogDialog
        open={addFuelDialogOpen}
        onClose={() => setAddFuelDialogOpen(false)}
        vehicleId={vehicle.id}
        vehiclePlate={vehicle.plate}
        currentDriverId={vehicle.driver?.id}
        onSuccess={() => {
          onUpdate?.();
        }}
      />
    </Stack>
  );
};

export default FuelTab;
