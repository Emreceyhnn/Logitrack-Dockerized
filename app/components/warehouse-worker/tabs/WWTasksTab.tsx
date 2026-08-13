import { Box, Stack, Typography, Card, Avatar, useTheme } from "@mui/material";
import { Ico } from "@/app/components/warehouse-worker/Ico";
import WWTaskRow from "@/app/components/warehouse-worker/WWTaskRow";
import { I } from "@/app/lib/utils/warehouseWorkerUi";
import type { WWState } from "@/app/hooks/useWarehouseWorkerState";

export default function WWTasksTab({ state }: { state: WWState }) {
  const theme = useTheme();
  const { ww, openTasks, highCount, tasks, advanceTask, currentZone } = state;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 800 }}>
          {ww.ui.myTaskQueue}
        </Typography>
        <Typography
          sx={{ fontSize: 13, color: theme.palette.text.secondary, mt: 1 }}
        >
          {openTasks} {ww.ui.openTasksCount} · {highCount} {ww.ui.highPriority}
        </Typography>
      </Box>
      <Card
        data-tour="ww-task-list"
        sx={{
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderRadius: 3,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ p: 2.5 }}
        >
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
            {ww.ui.allAssignedTasks}
          </Typography>
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
                bgcolor: "rgba(94, 91, 91, 0.01)",
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
              <WWTaskRow key={t.id} t={t} advanceTask={advanceTask} ww={ww} currentZone={currentZone} />
            ))
          )}
        </Box>
      </Card>
    </Stack>
  );
}
