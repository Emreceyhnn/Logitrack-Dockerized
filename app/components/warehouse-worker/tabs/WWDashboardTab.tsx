import {
  Box,
  Stack,
  Typography,
  Card,
  LinearProgress,
  Avatar,
  CircularProgress,
  Button,
  useTheme,
} from "@mui/material";
import { Ico } from "@/app/components/warehouse-worker/Ico";
import WWScanSection from "@/app/components/warehouse-worker/WWScanSection";
import WWTaskRow from "@/app/components/warehouse-worker/WWTaskRow";
import WWNextTaskCard from "@/app/components/warehouse-worker/WWNextTaskCard";
import WWLowStockCard from "@/app/components/warehouse-worker/WWLowStockCard";
import WWLiveFeed from "@/app/components/warehouse-worker/WWLiveFeed";
import WWRestockDialog from "@/app/components/warehouse-worker/WWRestockDialog";
import { zoneColor, I } from "@/app/lib/utils/warehouseWorkerUi";
import type { WWState } from "@/app/hooks/useWarehouseWorkerState";

export default function WWDashboardTab({ state }: { state: WWState }) {
  const theme = useTheme();
  const {
    dict,
    ww,
    picks,
    picksTarget,
    picksPct,
    packs,
    packsTarget,
    packsPct,
    openTasks,
    highCount,
    rate,
    currentZone,
    scanResult,
    scanInput,
    setScanInput,
    doScan,
    simScan,
    scanQty,
    setScanQty,
    log,
    adjust,
    setScanResult,
    tasks,
    nextTask,
    advanceTask,
    anyCritical,
    capacityPct,
    capUsed,
    capTotal,
    zones,
    setCurrentZone,
    onRestock,
    onReport,
    feed,
    lowStock,
    catalog,
    restockOpen,
    setRestockOpen,
    restockPending,
  } = state;

  const renderKpi = (
    label: string,
    color: string,
    icon: string,
    val: React.ReactNode,
    sub: React.ReactNode,
    pct?: number
  ) => (
    <Card
      sx={{
        bgcolor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        flex: 1,
        p: 2.5,
        borderRadius: 3,
        position: "relative",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg,${color},transparent)`,
        }}
      />
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Typography
          variant="overline"
          sx={{ color: theme.palette.text.secondary, fontWeight: 800 }}
        >
          {label}
        </Typography>
        <Avatar
          sx={{
            bgcolor: `${color}1f`,
            color,
            width: 38,
            height: 38,
            borderRadius: 2,
          }}
        >
          <Ico d={icon} size={19} />
        </Avatar>
      </Stack>
      <Box sx={{ mt: 1 }}>{val}</Box>
      {pct != null && (
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            mt: 2,
            height: 5,
            borderRadius: 5,
            bgcolor: "rgba(255,255,255,0.07)",
            "& .MuiLinearProgress-bar": { bgcolor: color },
          }}
        />
      )}
      {sub && (
        <Typography
          sx={{
            mt: 2,
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {sub}
        </Typography>
      )}
    </Card>
  );

  return (
    <Stack spacing={2.5}>
      <WWNextTaskCard nextTask={nextTask} advanceTask={advanceTask} ww={ww} />
      {/* 4-up on desktop, 2-up on phones — one KPI per row would push the rest
          of the dashboard below the fold. Grid rather than a row Stack so the
          cards wrap instead of being squeezed past legibility. */}
      <Box
        data-tour="ww-kpi-picks"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
          gap: { xs: 1.5, md: 2.25 },
        }}
      >
        {renderKpi(
          dict.warehouseWorker.dashboard.picksToday,
          theme.palette.kpi.amber,
          "M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2",
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 900 }}>
              {picks}
            </Typography>
            <Typography sx={{ color: theme.palette.text.secondary }}>
              / {picksTarget}
            </Typography>
          </Stack>,
          null,
          picksPct
        )}
        {renderKpi(
          dict.warehouseWorker.dashboard.packsToday,
          theme.palette.kpi.emerald,
          "M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8",
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 900 }}>
              {packs}
            </Typography>
            <Typography sx={{ color: theme.palette.text.secondary }}>
              / {packsTarget}
            </Typography>
          </Stack>,
          null,
          packsPct
        )}
        {renderKpi(
          dict.warehouseWorker.ui.myTaskQueue,
          theme.palette.primary.main,
          I.tasks,
          <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 900 }}>
            {openTasks}
          </Typography>,
          <Box component="span">
            <Box component="span" sx={{ color: theme.palette.error.main }}>
              ●
            </Box>{" "}
            {highCount} {dict.warehouseWorker.ui.highPriority}
          </Box>
        )}
        {renderKpi(
          dict.warehouseWorker.dashboard.throughput,
          theme.palette.kpi.purple,
          "M3 17l6-6 4 4 8-8M15 7h6v6",
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 900 }}>
              {rate}
            </Typography>
            <Typography
              sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
            >
              {dict.warehouseWorker.dashboard.unitsHr}
            </Typography>
          </Stack>,
          null
        )}
      </Box>
      {/* Two columns on desktop; below lg they stack, main column first, so the
          scan/task work the worker came for stays above the side panels. */}
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2.5}
        alignItems="stretch"
      >
        <Stack spacing={2.5} sx={{ flex: 1.55, minWidth: 0 }}>
          <Card
            sx={{
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderRadius: 3,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ p: { xs: 2, md: 2.5 } }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar
                  sx={{
                    bgcolor: `${theme.palette.primary.main}1f`,
                    color: theme.palette.primary.main,
                    borderRadius: 2,
                  }}
                >
                  <Ico d={I.scan} size={19} />
                </Avatar>
                <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                  {ww.ui.scanLog}
                </Typography>
              </Stack>
              <Box
                sx={{
                  color: theme.palette.primary.main,
                  bgcolor: "rgba(56,189,248,0.1)",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {ww.ui.pickZone} {currentZone}
              </Box>
            </Stack>
            <Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
              <WWScanSection
                scanResult={scanResult}
                scanInput={scanInput}
                setScanInput={setScanInput}
                doScan={doScan}
                simScan={simScan}
                scanQty={scanQty}
                setScanQty={setScanQty}
                log={log}
                adjust={adjust}
                setScanResult={setScanResult}
                ww={ww}
              />
            </Box>
          </Card>
          <Card
            sx={{
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderRadius: 3,
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ p: { xs: 2, md: 2.5 } }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar
                  sx={{
                    bgcolor: `${theme.palette.primary.main}1f`,
                    color: theme.palette.primary.main,
                    borderRadius: 2,
                  }}
                >
                  <Ico d={I.tasks} size={19} />
                </Avatar>
                <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                  {ww.ui.myTaskQueue}
                </Typography>
              </Stack>
              <Box
                sx={{
                  color: "rgba(255,255,255,0.55)",
                  bgcolor: "rgba(255,255,255,0.06)",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {openTasks} {ww.ui.openTasksCount}
              </Box>
            </Stack>
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: tasks.length === 0 ? 3 : 2,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                bgcolor: theme.palette.mode === "dark" ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.02)",
                boxShadow: "inset 0 4px 20px rgba(0,0,0,0.1)",
                borderBottomLeftRadius: 12,
                borderBottomRightRadius: 12,
              }}
            >
              {tasks.length === 0 ? (
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  spacing={2}
                  sx={{
                    py: 6,
                    px: 3,
                    flex: 1,
                    borderRadius: 3,
                    border: `1px dashed ${theme.palette.divider}`,
                    bgcolor: "rgba(255,255,255,0.01)",
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: "rgba(255,255,255,0.03)",
                      color: "rgba(255,255,255,0.3)",
                      width: 56,
                      height: 56,
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <Ico
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      size={24}
                    />
                  </Avatar>
                  <Box textAlign="center">
                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: theme.palette.text.secondary,
                        mb: 0.5,
                      }}
                    >
                      {ww.ui.nextTaskAllClear}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.3)",
                        fontWeight: 500,
                      }}
                    >
                      {ww.ui.taskQueueEmpty}
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                tasks.map((t) => (
                  <WWTaskRow
                    key={t.id}
                    t={t}
                    advanceTask={advanceTask}
                    ww={ww}
                    currentZone={currentZone}
                  />
                ))
              )}
            </Box>
          </Card>
        </Stack>
        <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
          <WWLowStockCard ww={ww} lowStock={lowStock} onRestock={onRestock} />
          <Card
            sx={{
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderRadius: 3,
              p: { xs: 2, md: 2.5 },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar
                  sx={{
                    bgcolor: `${theme.palette.primary.main}1f`,
                    color: theme.palette.primary.main,
                    borderRadius: 2,
                  }}
                >
                  <Ico d={I.capacity} size={19} />
                </Avatar>
                <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                  {ww.ui.siteCapacity}
                </Typography>
              </Stack>
              {anyCritical && (
                <Box
                  sx={{
                    color: theme.palette.error.main,
                    bgcolor: "rgba(244,67,54,0.12)",
                    px: 1,
                    py: 0.5,
                    borderRadius: 1.5,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {ww.ui.zoneNearFull}
                </Box>
              )}
            </Stack>
            <Stack direction="row" spacing={2.5} alignItems="center">
              <Box sx={{ position: "relative", display: "inline-flex" }}>
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={100}
                  sx={{ color: "rgba(255,255,255,0.08)" }}
                />
                <CircularProgress
                  variant="determinate"
                  value={capacityPct}
                  size={100}
                  sx={{
                    color: zoneColor(capacityPct, theme),
                    position: "absolute",
                    left: 0,
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: "absolute",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                  }}
                >
                  <Typography sx={{ fontSize: 22, fontWeight: 900 }}>
                    {capacityPct}%
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                  }}
                >
                  {ww.ui.palletPositions}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, mt: 1 }}>
                  {capUsed.toLocaleString()}{" "}
                  <Box
                    component="span"
                    sx={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}
                  >
                    / {capTotal.toLocaleString()}
                  </Box>
                </Typography>
              </Box>
            </Stack>
            <Stack
              spacing={1.5}
              sx={{
                mt: 2.5,
                pt: 2,
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              {zones.map((z) => (
                <Box key={z.name}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 0.5 }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color:
                          z.name === currentZone
                            ? "#fff"
                            : theme.palette.text.secondary,
                      }}
                    >
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          bgcolor: zoneColor(z.pct, theme),
                        }}
                      />
                      <Box>
                        {ww.ui.zone} {z.name}
                      </Box>
                      {z.name === currentZone && (
                        <Box
                          sx={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: theme.palette.primary.main,
                            bgcolor: "rgba(56,189,248,0.12)",
                            px: 0.5,
                            py: 0.25,
                            borderRadius: 1,
                          }}
                        >
                          {ww.ui.activeLabel}
                        </Box>
                      )}
                    </Stack>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: zoneColor(z.pct, theme),
                        fontFamily: "monospace",
                      }}
                    >
                      {z.pct}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={z.pct}
                    sx={{
                      height: 6,
                      borderRadius: 6,
                      bgcolor: "rgba(255,255,255,0.07)",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: zoneColor(z.pct, theme),
                      },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Card>
          <Card
            data-tour="ww-control-panel"
            sx={{
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderRadius: 3,
              p: { xs: 2, md: 2.5 },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ mb: 2 }}
            >
              <Avatar
                sx={{
                  bgcolor: `${theme.palette.kpi.purple}1f`,
                  color: theme.palette.kpi.purple,
                  borderRadius: 2,
                }}
              >
                <Ico
                  d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h12M20 18h0"
                  size={19}
                />
              </Avatar>
              <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                {ww.ui.controlPanel}
              </Typography>
            </Stack>
            <Typography
              variant="overline"
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 700,
                mb: 1,
              }}
            >
              {ww.ui.activePickZone}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {zones
                .map((z) => z.name)
                .map((z) => {
                  const on = z === currentZone;
                  return (
                    <Button
                      key={z}
                      onClick={() => setCurrentZone(z)}
                      sx={{
                        flex: 1,
                        borderRadius: 3,
                        fontWeight: 700,
                        border: `1px solid ${on ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.1)"}`,
                        bgcolor: on
                          ? "rgba(56,189,248,0.16)"
                          : "rgba(255,255,255,0.03)",
                        color: on
                          ? theme.palette.primary.main
                          : theme.palette.text.secondary,
                      }}
                    >
                      {z}
                    </Button>
                  );
                })}
            </Stack>
            <Typography
              variant="overline"
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 700,
                mb: 1,
              }}
            >
              {ww.ui.quickActions}
            </Typography>
            <Stack data-tour="ww-quick-actions" spacing={1}>
              <Button
                onClick={() => setRestockOpen(true)}
                startIcon={<Ico d="M12 3v11M8 10l4 4 4-4M4 21h16" size={17} />}
                sx={{
                  justifyContent: "flex-start",
                  py: 1.5,
                  borderRadius: 3,
                  bgcolor: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.22)",
                  color: theme.palette.kpi.cyan,
                  fontWeight: 700,
                  textTransform: "none",
                }}
              >
                {ww.ui.requestRestockZone} {currentZone}
              </Button>
              <Button
                onClick={onReport}
                startIcon={
                  <Ico d="M12 3 2 20h20L12 3zM12 10v4M12 17h.01" size={17} />
                }
                sx={{
                  justifyContent: "flex-start",
                  py: 1.5,
                  borderRadius: 3,
                  bgcolor: "rgba(244,67,54,0.08)",
                  border: "1px solid rgba(244,67,54,0.22)",
                  color: theme.palette.error.main,
                  fontWeight: 700,
                  textTransform: "none",
                }}
              >
                {ww.ui.reportIssue}
              </Button>
            </Stack>
          </Card>
        </Stack>
      </Stack>
      <WWLiveFeed fd={feed} ww={dict.warehouseWorker} />
      <WWRestockDialog
        open={restockOpen}
        onClose={() => setRestockOpen(false)}
        ww={ww}
        zones={zones}
        currentZone={currentZone}
        catalog={catalog}
        onSubmit={onRestock}
        loading={restockPending}
      />
    </Stack>
  );
}
