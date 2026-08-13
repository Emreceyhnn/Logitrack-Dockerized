import { Box, Stack, Typography, Card, TextField, Button, useTheme } from "@mui/material";
import type { DriverConsoleState } from "@/app/hooks/useDriverConsoleState";
import type { IssuePriority } from "@prisma/client";

export default function DCVehicleView({ state }: { state: DriverConsoleState }) {
  const theme = useTheme();
  const {
    dc,
    vehicle,
    fuelForm,
    setFuelField,
    submitFuel,
    fuelLogs,
    issueTitle,
    setIssueTitle,
    issuePriority,
    setIssuePriority,
    submitIssue,
    issues,
  } = state;

  const fuelLevel = vehicle?.fuelLevel ?? 0;
  const fuelColor = fuelLevel < 25 ? "#F44336" : fuelLevel < 50 ? "#f59e0b" : "#34D399";

  const priorities: { key: IssuePriority; label: string }[] = [
    { key: "LOW", label: dc.vehicleView.priorityLow },
    { key: "MEDIUM", label: dc.vehicleView.priorityMedium },
    { key: "HIGH", label: dc.vehicleView.priorityHigh },
  ];

  return (
    <Stack spacing={2.5}>
      <Card
        sx={{
          bgcolor: theme.palette.background.paper,
          borderRadius: 3,
          p: { xs: 2, sm: 2.5 },
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" sx={{ fontWeight: 800, color: theme.palette.text.secondary }}>
            {dc.vehicleView.assignedVehicle}
          </Typography>
          <Typography sx={{ fontSize: { xs: 22, sm: 24 }, fontWeight: 900, mt: 0.75 }}>
            {vehicle?.plate ?? "—"}
          </Typography>
          <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary, mt: 0.25 }}>
            {vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.fleetNo}` : "—"}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={{ xs: 3, sm: 4 }}
          flexWrap="wrap"
          useFlexGap
          sx={{ flexShrink: 0 }}
        >
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 800, color: theme.palette.text.secondary }}>
              {dc.vehicleView.fuel}
            </Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 900, mt: 0.5, color: fuelColor }}>
              %{fuelLevel}
            </Typography>
            <Box
              sx={{
                width: 110,
                height: 6,
                borderRadius: 6,
                bgcolor: "rgba(255,255,255,0.08)",
                mt: 1,
                overflow: "hidden",
              }}
            >
              <Box sx={{ height: "100%", width: `${fuelLevel}%`, bgcolor: fuelColor }} />
            </Box>
          </Box>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 800, color: theme.palette.text.secondary }}>
              {dc.vehicleView.odometer}
            </Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 900, mt: 0.5 }}>
              {vehicle?.odometerKm != null ? `${vehicle.odometerKm.toLocaleString("tr-TR")} km` : "—"}
            </Typography>
          </Box>
        </Stack>
      </Card>

      {/* minWidth 280 would overflow a 375px viewport once page padding is
          taken; the cards stack instead and only pair up from sm. */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2.5}
        flexWrap="wrap"
        alignItems="stretch"
        useFlexGap
      >
        <Card
          sx={{
            flex: 1,
            minWidth: { sm: 280 },
            bgcolor: theme.palette.background.paper,
            borderRadius: 3,
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 1.75 }}>{dc.vehicleView.addFuelLog}</Typography>
          <Stack spacing={1.5}>
            <TextField
              size="small"
              placeholder={dc.vehicleView.volumeLiter}
              value={fuelForm.volumeLiter}
              onChange={(e) => setFuelField("volumeLiter", e.target.value)}
              type="number"
            />
            <TextField
              size="small"
              placeholder={dc.vehicleView.cost}
              value={fuelForm.cost}
              onChange={(e) => setFuelField("cost", e.target.value)}
              type="number"
            />
            <TextField
              size="small"
              placeholder={dc.vehicleView.odometerKm}
              value={fuelForm.odometerKm}
              onChange={(e) => setFuelField("odometerKm", e.target.value)}
              type="number"
            />
            <Button
              onClick={() => void submitFuel()}
              sx={{
                py: 1.25,
                borderRadius: 2.5,
                fontWeight: 800,
                textTransform: "none",
                color: "#0B0F19",
                bgcolor: "#34D399",
              }}
            >
              {dc.vehicleView.submitFuelLog}
            </Button>
          </Stack>
          <Stack sx={{ mt: 2 }} spacing={1}>
            {fuelLogs.map((fl) => (
              <Stack
                key={fl.id}
                direction="row"
                justifyContent="space-between"
                spacing={1}
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.secondary,
                  py: 1,
                  borderTop: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Box component="span" sx={{ flexShrink: 0 }}>
                  {new Date(fl.date).toLocaleDateString("tr-TR")}
                </Box>
                <Box component="span" sx={{ textAlign: "right", minWidth: 0 }}>
                  {fl.volumeLiter} L · {fl.cost.toFixed(2)} {fl.currency}
                </Box>
              </Stack>
            ))}
          </Stack>
        </Card>

        <Card
          sx={{
            flex: 1,
            minWidth: { sm: 280 },
            bgcolor: theme.palette.background.paper,
            borderRadius: 3,
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 1.75 }}>{dc.vehicleView.reportIssue}</Typography>
          <Stack spacing={1.5}>
            <TextField
              size="small"
              placeholder={dc.vehicleView.issueTitle}
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
            />
            <Stack direction="row" spacing={1}>
              {priorities.map((p) => {
                const active = issuePriority === p.key;
                return (
                  <Box
                    key={p.key}
                    component="button"
                    type="button"
                    onClick={() => setIssuePriority(p.key)}
                    sx={{
                      flex: 1,
                      textAlign: "center",
                      py: 1.25,
                      borderRadius: 2.25,
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      font: "inherit",
                      color: active ? theme.palette.warning.main : "rgba(255,255,255,0.5)",
                      bgcolor: active ? "rgba(245,158,11,0.12)" : "transparent",
                      border: `1px solid ${active ? theme.palette.warning.main : "rgba(255,255,255,0.14)"}`,
                    }}
                  >
                    {p.label}
                  </Box>
                );
              })}
            </Stack>
            <Button
              onClick={() => void submitIssue()}
              sx={{
                py: 1.25,
                borderRadius: 2.5,
                fontWeight: 800,
                textTransform: "none",
                color: "#fff",
                bgcolor: "rgba(244,67,54,0.85)",
              }}
            >
              {dc.vehicleView.submitIssue}
            </Button>
          </Stack>
          <Stack sx={{ mt: 2 }} spacing={1}>
            {issues.map((is) => (
              <Stack
                key={is.id}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1}
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.secondary,
                  py: 1,
                  borderTop: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Box component="span" sx={{ minWidth: 0, wordBreak: "break-word" }}>
                  {is.title}
                </Box>
                <Box
                  component="span"
                  sx={{
                    flexShrink: 0,
                    fontSize: 10,
                    fontWeight: 800,
                    color: theme.palette.warning.main,
                  }}
                >
                  {is.status}
                </Box>
              </Stack>
            ))}
          </Stack>
        </Card>
      </Stack>
    </Stack>
  );
}
