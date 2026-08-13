import {
  Box,
  Button,
  Card,
  CardActionArea,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { Issue, IssueStatus } from "@/app/lib/type/enums";
import { PriorityChip } from "../../../chips/priorityChips";
import PendingIcon from "@mui/icons-material/Pending";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDate } from "@/app/lib/utils/date";
import { getStatusMeta } from "@/app/lib/priorityColor";

interface OpenIssuesCardProps {
  openIssues: Issue[];
  setReportDialogOpen: (open: boolean) => void;
  handleIssueClick: (issue: Issue) => void;
}

export const OpenIssuesCard = ({
  openIssues,
  setReportDialogOpen,
  handleIssueClick,
}: OpenIssuesCardProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const dateSettings = useDateSettings();

  return (
    <Card
      sx={{
        p: 2,
        flex: 2,
        borderRadius: "8px",
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.03)"
            : "rgba(0,0,0,0.02)",
        backgroundImage: "none",
        boxShadow: "none",
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Stack
        direction={"row"}
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <Typography
          sx={{ fontSize: 18, fontWeight: 700, color: "text.primary" }}
        >
          {dict.vehicles.dialogs.openIssues}
        </Typography>
        <Button
          variant="contained"
          sx={{
            color: "#fff",
            boxShadow: "none",
            bgcolor: theme.palette.primary.main,
            textTransform: "none",
            "&:hover": { bgcolor: theme.palette.primary._alpha.main_90 },
          }}
          onClick={() => setReportDialogOpen(true)}
        >
          + {dict.vehicles.dialogs.reportIssue}
        </Button>
      </Stack>
      {/* Fade wrapper — stays fixed; scroll happens inside */}
      <Box
        mt={2}
        sx={{
          position: "relative",
          /* Gradient fade only when list overflows */
          ...(openIssues.length > 2 && {
            maskImage:
              "linear-gradient(to bottom, black 75%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 75%, transparent 100%)",
          }),
        }}
      >
        <Box
          sx={{
            maxHeight: 190,
            overflowY: "auto",
            overflowX: "hidden",
            pr: 1,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            /* Custom Scrollbar */
            "&::-webkit-scrollbar": {
              width: "5px",
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: theme.palette.divider,
              borderRadius: "10px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: theme.palette.text.secondary,
            },
          }}
        >
          {openIssues.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
            >
              {dict.vehicles.dialogs.noOpenIssues}
            </Typography>
          ) : (
            openIssues.map((i, index) => (
              <Card
                key={index}
                sx={{
                  borderRadius: "8px",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.01)",
                  overflow: "hidden",
                  backgroundImage: "none",
                  boxShadow: "none",
                  border: `1px solid ${theme.palette.divider}`,
                  flexShrink: 0,
                }}
              >
                <CardActionArea
                  onClick={() => handleIssueClick(i)}
                  sx={{
                    p: 2,
                    "&:hover": {
                      bgcolor: theme.palette.common.white_alpha.main_05,
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        height: 10,
                        width: 10,
                        borderRadius: "50%",
                        flexShrink: 0,
                        bgcolor: getStatusMeta(i.priority, dict).color,
                      }}
                    />
                    <Stack flexGrow={1} minWidth={0}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography
                          noWrap
                          sx={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "text.primary",
                          }}
                        >
                          {i.title}
                        </Typography>
                        {i.status === IssueStatus.IN_PROGRESS && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              px: 1,
                              py: 0.25,
                              borderRadius: "10px",
                              bgcolor: "info._alpha.main_10",
                              border: "1px solid",
                              borderColor: "info._alpha.main_20",
                            }}
                          >
                            <PendingIcon
                              sx={{
                                fontSize: 14,
                                color: "info.main",
                                animation: "pulse 2s infinite ease-in-out",
                                "@keyframes pulse": {
                                  "0%": { opacity: 1, transform: "scale(1)" },
                                  "50%": { opacity: 0.5, transform: "scale(1.2)" },
                                  "100%": { opacity: 1, transform: "scale(1)" },
                                },
                              }}
                            />
                            <Typography
                              sx={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "info.main",
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}
                            >
                              {dict.vehicles.statuses.IN_PROGRESS}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 200,
                          color: "text.secondary",
                        }}
                      >
                        {dict.vehicles.dialogs.reportedOn}{" "}
                        {formatDisplayDate(i.createdAt, dateSettings)}
                      </Typography>
                    </Stack>
                    <PriorityChip status={i.priority} />
                  </Stack>
                </CardActionArea>
              </Card>
            ))
          )}
        </Box>
      </Box>
    </Card>
  );
};
