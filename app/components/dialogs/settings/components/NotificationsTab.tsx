import {
  Box,
  Typography,
  Stack,
  Button,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  NotificationsActive as NotifIcon,
  Save as SaveIcon,
  EmailOutlined as EmailOutlinedIcon,
} from "@mui/icons-material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  SettingsPageState,
  SettingsPageActions,
} from "@/app/lib/type/settings";
import NotificationRow from "./NotificationRow";

interface NotificationsTabProps {
  state: SettingsPageState;
  actions: SettingsPageActions;
}

export default function NotificationsTab({
  state,
  actions,
}: NotificationsTabProps) {
  const dict = useDictionary();

  return (
    <Stack spacing={2.2}>
      <Box>
        <Stack direction="row" alignItems="center" gap={1} mb={2}>
          <Box
            sx={{
              p: 0.8,
              borderRadius: 1.5,
              bgcolor: (theme) => theme.palette.primary._alpha.main_10,
            }}
          >
            <EmailOutlinedIcon sx={{ fontSize: 16, color: "primary.main" }} />
          </Box>
          <Typography
            variant="caption"
            fontWeight={850}
            sx={{
              color: (theme) => theme.palette.common.white_alpha.main_60,
              letterSpacing: 1.2,
            }}
          >
            {dict.settings.dialogs.notifications.emailChannels}
          </Typography>
        </Stack>
        <Stack spacing={1.5}>
          <NotificationRow
            label={dict.settings.dialogs.notifications.fleetStatus}
            description={dict.settings.dialogs.notifications.fleetStatusDesc}
            checked={state.notifications.emailShipmentUpdates}
            onChange={(v) =>
              actions.updateNotifications({ emailShipmentUpdates: v })
            }
          />
          <NotificationRow
            label={dict.settings.dialogs.notifications.preventiveMaintenance}
            description={
              dict.settings.dialogs.notifications.preventiveMaintenanceDesc
            }
            checked={state.notifications.emailMaintenanceAlerts}
            onChange={(v) =>
              actions.updateNotifications({ emailMaintenanceAlerts: v })
            }
          />
          <NotificationRow
            label={dict.settings.dialogs.notifications.dynamicRouting}
            description={
              dict.settings.dialogs.notifications.dynamicRoutingEmailDesc
            }
            checked={state.notifications.emailNewAssignments}
            onChange={(v) =>
              actions.updateNotifications({ emailNewAssignments: v })
            }
          />
          <NotificationRow
            label={dict.settings.dialogs.notifications.networkAnomalies}
            description={
              dict.settings.dialogs.notifications.networkAnomaliesEmailDesc
            }
            checked={state.notifications.emailDelayAlerts}
            onChange={(v) =>
              actions.updateNotifications({ emailDelayAlerts: v })
            }
          />
          <NotificationRow
            label={dict.settings.dialogs.notifications.executiveKpi}
            description={dict.settings.dialogs.notifications.executiveKpiDesc}
            checked={state.notifications.emailWeeklyReports}
            onChange={(v) =>
              actions.updateNotifications({ emailWeeklyReports: v })
            }
            disabled
          />
        </Stack>
      </Box>

      <Divider
        sx={{
          borderColor: (theme) => theme.palette.common.white_alpha.main_05,
        }}
      />

      <Box>
        <Stack direction="row" alignItems="center" gap={1} mb={2}>
          <Box
            sx={{
              p: 0.8,
              borderRadius: 1.5,
              bgcolor: (theme) => theme.palette.primary._alpha.main_10,
            }}
          >
            <NotifIcon sx={{ fontSize: 16, color: "primary.main" }} />
          </Box>
          <Typography
            variant="caption"
            fontWeight={850}
            sx={{
              color: (theme) => theme.palette.common.white_alpha.main_60,
              letterSpacing: 1.2,
            }}
          >
            {dict.settings.dialogs.notifications.realTimeSignals}
          </Typography>
        </Stack>
        <Stack spacing={1.5}>
          <NotificationRow
            label={dict.settings.dialogs.notifications.dynamicRouting}
            description={dict.settings.dialogs.notifications.dynamicRoutingDesc}
            checked={state.notifications.pushNewAssignments}
            onChange={(v) =>
              actions.updateNotifications({ pushNewAssignments: v })
            }
          />
          <NotificationRow
            label={dict.settings.dialogs.notifications.networkAnomalies}
            description={
              dict.settings.dialogs.notifications.networkAnomaliesDesc
            }
            checked={state.notifications.pushDelayAlerts}
            onChange={(v) =>
              actions.updateNotifications({ pushDelayAlerts: v })
            }
          />
        </Stack>
      </Box>

      <Box display="flex" justifyContent="flex-end" pt={1}>
        <Button
          variant="contained"
          startIcon={
            state.isSaving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SaveIcon sx={{ fontSize: 18 }} />
            )
          }
          onClick={actions.saveNotifications}
          disabled={state.isSaving}
          sx={{
            textTransform: "none",
            fontWeight: 800,
            borderRadius: 2.5,
            px: 4,
            py: 1,
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            boxShadow: (theme) =>
              `0 8px 32px ${theme.palette.primary._alpha.main_25}`,
            "&:hover": {
              boxShadow: (theme) =>
                `0 12px 40px ${theme.palette.primary._alpha.main_35}`,
              transform: "translateY(-1px)",
            },
            transition: "all 0.2s",
          }}
        >
          {state.isSaving
            ? dict.common.synchronizing
            : dict.settings.dialogs.notifications.updateWebhooks}
        </Button>
      </Box>
    </Stack>
  );
}
