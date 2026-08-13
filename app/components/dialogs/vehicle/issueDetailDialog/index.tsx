import {
  Dialog,
  DialogContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  useTheme,
  Divider,
  PaletteColor,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { useState, useEffect } from "react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { updateIssue } from "@/app/lib/controllers/vehicle";
import { getPriorityColor } from "@/app/lib/priorityColor";
import { IssueStatus, IssuePriority } from "@/app/lib/type/enums";
import type { Issue } from "@/app/lib/type/enums";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDate } from "@/app/lib/utils/date";
import { logger } from "@/app/lib/logger";


interface IssueDetailDialogProps {
  open: boolean;
  onClose: () => void;
  issue: Issue | null;
  onUpdate: () => void;
}

export default function IssueDetailDialog({
  open,
  onClose,
  issue,
  onUpdate,
}: IssueDetailDialogProps) {
  const dict = useDictionary();
  /* ---------------------------------- theme --------------------------------- */
  const theme = useTheme();
  const dateSettings = useDateSettings();

  /* --------------------------------- states --------------------------------- */
  const [status, setStatus] = useState<IssueStatus | "">("");
  const [priority, setPriority] = useState<IssuePriority | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -------------------------------- lifecycle ------------------------------- */
  useEffect(() => {
    if (issue) {
      setStatus(issue.status as IssueStatus);
      setPriority(issue.priority as IssuePriority);
    }
  }, [issue]);

  /* -------------------------------- handlers -------------------------------- */
  const handleUpdate = async () => {
    if (!issue) return;
    setLoading(true);
    setError(null);

    try {
      await updateIssue(issue.id, { 
        status: status as IssueStatus, 
        priority: priority as IssuePriority 
      });
      onUpdate();
      onClose();
    } catch (err) {
      logger.error(err);
      setError(dict.vehicles.dialogs.failedToUpdateIssue || "Failed to update issue");
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------- styles --------------------------------- */
  const selectSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      "& fieldset": {
        borderColor: "divider",
      },
      "&:hover fieldset": {
        borderColor: "primary.main",
      },
    },
    "& .MuiInputLabel-root": {
      fontSize: "0.85rem",
    },
    "& .MuiOutlinedInput-input": {
      fontSize: "0.9rem",
    },
  };

  /* --------------------------------- render --------------------------------- */
  if (!issue) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                bgcolor: theme.palette.primary._alpha.main_10,
                color: theme.palette.primary.main,
                p: 1.25,
                borderRadius: 2,
                display: "flex",
              }}
            >
              <AssignmentIcon />
            </Box>
            <Box>
              <Typography component="div" variant="h6" fontWeight={800} color="text.primary">
                {dict.vehicles.dialogs.issueDetails}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block", fontWeight: 500 }}>
                {dict.vehicles.dialogs.referenceId}: <span style={{ color: theme.palette.primary.main, fontWeight: 700 }}>#{issue.id.slice(-6).toLocaleUpperCase('en-US')}</span>
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }} aria-label="close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ p: 3, pt: 1 }}>
        <Stack spacing={4}>
          {error && (
            <Alert 
              severity="error" 
              variant="filled"
              sx={{ 
                borderRadius: 2,
                bgcolor: (theme) => theme.palette.mode === "dark" ? "error._alpha.main_10" : "error._alpha.main_05",
                color: "error.light",
                border: (theme) => `1px solid ${theme.palette.error._alpha.main_20}`,
              }}
            >
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>
                {dict.vehicles.dialogs.incidentTitle}
              </Typography>
              <Typography variant="h5" color="text.primary" fontWeight={800}>
                {issue.title}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 1, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>
                {dict.vehicles.dialogs.problemDesc}
              </Typography>
              <Box 
                sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontWeight: 500 }}>
                  {issue.description || dict.vehicles.dialogs.noSupplementalDetails}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.5, display: "block", textTransform: "uppercase" }}>
                  {dict.vehicles.dialogs.reportedOn}
                </Typography>
                <Typography variant="body2" color="text.primary" fontWeight={600}>
                  {formatDisplayDate(issue.createdAt, dateSettings)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ borderColor: "divider" }} />

            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mb: 2, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>
                {dict.vehicles.dialogs.configurationStatus}
              </Typography>
              <Stack direction="row" spacing={2.5}>
                <FormControl fullWidth sx={selectSx}>
                  <InputLabel shrink sx={{ color: "text.secondary" }}>{dict.vehicles.fields.status}</InputLabel>
                  <Select
                    value={status}
                    label={dict.vehicles.fields.status}
                    notched
                    onChange={(e) => setStatus(e.target.value)}
                    sx={{ height: 48 }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundImage: "none",
                        }
                      }
                    }}
                  >
                    <MenuItem value={IssueStatus.OPEN}>{dict.vehicles.statuses.OPEN || "Open"}</MenuItem>
                    <MenuItem value={IssueStatus.IN_PROGRESS}>{dict.vehicles.statuses.IN_PROGRESS}</MenuItem>
                    <MenuItem value={IssueStatus.RESOLVED}>{dict.vehicles.statuses.RESOLVED || "Resolved"}</MenuItem>
                    <MenuItem value={IssueStatus.CLOSED}>{dict.vehicles.statuses.CLOSED || "Closed"}</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={selectSx}>
                  <InputLabel shrink sx={{ color: "text.secondary" }}>{dict.vehicles.fields.priority}</InputLabel>
                  <Select
                    value={priority}
                    label={dict.vehicles.fields.priority}
                    notched
                    onChange={(e) => setPriority(e.target.value)}
                    sx={{ height: 48 }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundImage: "none",
                        }
                      }
                    }}
                    renderValue={(value) => {
                      const colorKey = getPriorityColor(value as string) as "error" | "warning" | "info" | "success";
                      const paletteColor = theme.palette[colorKey] as PaletteColor;
                      const mainColor = paletteColor?.main || theme.palette.text.primary;
                      return (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: mainColor, boxShadow: (theme) => theme.palette.mode === "dark" ? `0 0 10px ${paletteColor?._alpha.main_50}` : "none" }} />
                          <Typography variant="body2" color="text.primary" fontWeight={600}>{dict.vehicles.priorities[value as keyof typeof dict.vehicles.priorities] || value as string}</Typography>
                        </Box>
                      );
                    }}
                  >
                    {(Object.values(IssuePriority) as IssuePriority[]).map((p) => (
                      <MenuItem key={p as string} value={p} sx={{ py: 1.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: getPriorityColor(p as string) }} />
                          <Typography variant="body2">{dict.vehicles.priorities[p as keyof typeof dict.vehicles.priorities] || p as string}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>

      <Box sx={{ p: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button 
            onClick={onClose} 
            disabled={loading}
            sx={{ 
              color: "text.secondary", 
              textTransform: "none", 
              fontWeight: 600,
              px: 3
            }}
          >
            {dict.common.cancel}
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={loading}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 4,
              boxShadow: `0 8px 24px ${theme.palette.primary._alpha.main_20}`,
              fontWeight: 700,
              minWidth: 160,
            }}
          >
            {loading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} color="inherit" />
                <span>{dict.vehicles.dialogs.savingChanges}</span>
              </Stack>
            ) : dict.vehicles.dialogs.updateIssue}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
