import {
  Box,
  Stack,
  Typography,
  Chip,
  Button,
  CircularProgress,
  IconButton,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import PlaceIcon from "@mui/icons-material/Place";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { RouteWithRelations } from "@/app/lib/type/routes";
import { RouteStatus } from "@/app/lib/type/enums";
import { Dictionary } from "@/app/lib/language/language";

interface RouteDialogHeaderProps {
  route: RouteWithRelations;
  dict: Dictionary;
  statusMeta: { color: string; label: string };
  statusColor: string;
  statusAlpha: Record<string, string>;
  statusLoading: boolean;
  onStatusChange: (status: RouteStatus) => void;
  onClose: () => void;
}

export const RouteDialogHeader = ({
  route,
  dict,
  statusMeta,
  statusColor,
  statusAlpha,
  statusLoading,
  onStatusChange,
  onClose,
}: RouteDialogHeaderProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        p: 3,
        background: `linear-gradient(135deg, ${statusAlpha.main_10} 0%, transparent 100%)`,
        borderBottom: `1px solid ${theme.palette.divider_alpha.main_05}`,
        position: "relative",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Stack direction="row" spacing={3} alignItems="center">
          <Box
            sx={{
              p: 2,
              borderRadius: "16px",
              background: `linear-gradient(135deg, ${statusAlpha.main_20}, ${statusAlpha.main_05})`,
              border: `1px solid ${statusAlpha.main_20}`,
              display: "flex",
            }}
          >
            <AltRouteIcon sx={{ color: statusColor, fontSize: 32 }} />
          </Box>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{ color: "text.primary", letterSpacing: "-0.02em" }}
              >
                {dict.routes.title} #{route.id.slice(-6).toLocaleUpperCase('en-US')}
              </Typography>
              <Chip
                label={statusMeta.label}
                sx={{
                  height: 24,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  bgcolor: statusAlpha.main_10,
                  color: statusColor,
                  border: `1px solid ${statusAlpha.main_20}`,
                  borderRadius: "6px",
                  textTransform: "uppercase",
                }}
              />
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <PlaceIcon sx={{ fontSize: 16 }} />
              {route.name || dict.routes.dialogs.deliveryLabel}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Action Buttons based on status */}
          {route.status === "PLANNED" && (
            <>
              <Button
                variant="contained"
                onClick={() => onStatusChange("ACTIVE")}
                disabled={statusLoading}
                sx={{
                  bgcolor: theme.palette.success.main,
                  "&:hover": { bgcolor: theme.palette.success.dark },
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2,
                  height: 36,
                }}
              >
                {dict.common.start}
              </Button>
              <Button
                variant="outlined"
                onClick={() => onStatusChange("CANCELED")}
                disabled={statusLoading}
                sx={{
                  color: theme.palette.error.main,
                  borderColor: theme.palette.error.main,
                  "&:hover": {
                    bgcolor: theme.palette.error._alpha.main_05,
                    borderColor: theme.palette.error.dark,
                  },
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2,
                  height: 36,
                }}
              >
                {dict.common.cancel}
              </Button>
            </>
          )}

          {route.status === "ACTIVE" && (
            <>
              <Button
                variant="contained"
                onClick={() => onStatusChange("COMPLETED")}
                disabled={statusLoading}
                startIcon={
                  statusLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <CheckCircleIcon sx={{ fontSize: 18 }} />
                  )
                }
                sx={{
                  bgcolor: theme.palette.primary.main,
                  "&:hover": { bgcolor: theme.palette.primary.dark },
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2,
                  height: 36,
                }}
              >
                {dict.common.complete}
              </Button>
              <Button
                variant="text"
                onClick={() => onStatusChange("CANCELED")}
                disabled={statusLoading}
                sx={{
                  color: theme.palette.text.secondary,
                  "&:hover": {
                    color: theme.palette.error.main,
                    bgcolor: theme.palette.error._alpha.main_05,
                  },
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 600,
                  height: 36,
                }}
              >
                {dict.common.cancel}
              </Button>
            </>
          )}

          <IconButton
            onClick={onClose}
            sx={{
              color: "text.secondary",
              "&:hover": {
                color: "text.primary",
                bgcolor: theme.palette.action.hover,
              },
            }}
            aria-label="close">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );
};
