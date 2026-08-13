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
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { MaintenanceRecord } from "@/app/lib/type/enums";
import { getStatusMeta } from "@/app/lib/priorityColor";
import { formatDisplayDate } from "@/app/lib/utils/date";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import PendingIcon from "@mui/icons-material/Pending";
import CancelIcon from "@mui/icons-material/Cancel";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useCurrency } from "@/app/hooks/useCurrency";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { RefObject } from "react";

const getStatusIcon = (status: string) => {
  const s = status?.toLocaleUpperCase("en-US");
  switch (s) {
    case "COMPLETED":
      return <CheckCircleIcon sx={{ fontSize: 14 }} />;
    case "IN_PROGRESS":
      return (
        <PendingIcon
          sx={{
            fontSize: 14,
            animation: "pulse 2s infinite ease-in-out",
            "@keyframes pulse": {
              "0%": { opacity: 1, transform: "scale(1)" },
              "50%": { opacity: 0.5, transform: "scale(1.2)" },
              "100%": { opacity: 1, transform: "scale(1)" },
            },
          }}
        />
      );
    case "SCHEDULED":
    case "OPEN":
      return <ErrorIcon sx={{ fontSize: 14 }} />;
    case "CANCELLED":
      return <CancelIcon sx={{ fontSize: 14 }} />;
    default:
      return null;
  }
};

interface MaintenanceHistoryCardProps {
  maintenanceHistory: MaintenanceRecord[];
  scrollRef: RefObject<HTMLDivElement | null>;
  setMaintenanceDialogOpen: (open: boolean) => void;
  setSelectedRecord: (record: MaintenanceRecord) => void;
  setMaintenanceDetailOpen: (open: boolean) => void;
}

export const MaintenanceHistoryCard = ({
  maintenanceHistory,
  scrollRef,
  setMaintenanceDialogOpen,
  setSelectedRecord,
  setMaintenanceDetailOpen,
}: MaintenanceHistoryCardProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const dateSettings = useDateSettings();
  const { formatFrom, isLoading: currencyLoading } = useCurrency();

  return (
    <Card
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        borderRadius: "8px",
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.03)"
            : "rgba(0,0,0,0.02)",
        backgroundImage: "none",
        boxShadow: "none",
        border: `1px solid ${theme.palette.divider}`,
        maxHeight: 350,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography
          sx={{ fontSize: 18, fontWeight: 700, color: "text.primary" }}
        >
          {dict.vehicles.dialogs.recentMaintenance}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setMaintenanceDialogOpen(true)}
        >
          {dict.vehicles.dialogs.addRecord}
        </Button>
      </Stack>
      <Box
        ref={scrollRef}
        sx={{
          overflowX: "auto",
          overflowY: "auto",
          flex: 1,
          maxHeight: 200,
          pr: 1,
          "&::-webkit-scrollbar": {
            width: "5px",
            height: "5px",
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
          maskImage:
            maintenanceHistory.length > 4
              ? "linear-gradient(to bottom, black 85%, transparent 100%)"
              : "none",
          WebkitMaskImage:
            maintenanceHistory.length > 4
              ? "linear-gradient(to bottom, black 85%, transparent 100%)"
              : "none",
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell
                align="left"
                sx={{
                  color: "text.secondary",
                  borderBottomColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                {dict.common.date}
              </TableCell>
              <TableCell
                align="left"
                sx={{
                  color: "text.secondary",
                  borderBottomColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                {dict.vehicles.dialogs.serviceType}
              </TableCell>
              <TableCell
                align="left"
                sx={{
                  color: "text.secondary",
                  borderBottomColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                {dict.common.technician}
              </TableCell>
              <TableCell
                align="left"
                sx={{
                  color: "text.secondary",
                  borderBottomColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                {dict.vehicles.dialogs.cost}
              </TableCell>
              <TableCell
                align="left"
                sx={{
                  color: "text.secondary",
                  borderBottomColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                {dict.vehicles.dialogs.status}
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {maintenanceHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {dict.vehicles.dialogs.noMaintenanceFound}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              maintenanceHistory.map((v, index) => (
                <TableRow
                  key={index}
                  onClick={() => {
                    setSelectedRecord(v);
                    setMaintenanceDetailOpen(true);
                  }}
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                    "&:hover": {
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.03)",
                      cursor: "pointer",
                    },
                    transition: "all 0.2s",
                    opacity:
                      v.status === "COMPLETED" || v.status === "CANCELLED"
                        ? 0.5
                        : 1,
                    filter:
                      v.status === "COMPLETED" || v.status === "CANCELLED"
                        ? "grayscale(0.6)"
                        : "none",
                  }}
                >
                  <TableCell
                    align="left"
                    sx={{
                      color: "text.primary",
                      borderBottomColor: "divider",
                    }}
                  >
                    <Typography sx={{ fontSize: 12 }}>
                      {formatDisplayDate(v.date, dateSettings)}
                    </Typography>
                  </TableCell>
                  <TableCell
                    align="left"
                    sx={{
                      color: "text.primary",
                      borderBottomColor: "divider",
                    }}
                  >
                    <Typography sx={{ fontSize: 12 }}>
                      {dict.vehicles.serviceTypes?.[
                        v.type as keyof typeof dict.vehicles.serviceTypes
                      ] || v.type}
                    </Typography>
                  </TableCell>
                  <TableCell
                    align="left"
                    sx={{
                      color: "text.primary",
                      borderBottomColor: "divider",
                    }}
                  >
                    {v.description?.split(":")[1] || dict.common.na}
                  </TableCell>
                  <TableCell
                    align="left"
                    sx={{
                      color: "text.primary",
                      borderBottomColor: "divider",
                    }}
                  >
                    {currencyLoading
                      ? "..."
                      : formatFrom(v.cost, v.currency || "USD", 2)}
                  </TableCell>
                  <TableCell
                    align="left"
                    sx={{
                      borderBottomColor: "divider",
                    }}
                  >
                    {(() => {
                      const statusMeta = getStatusMeta(
                        v.status || "COMPLETED",
                        dict
                      );
                      const paletteKey = statusMeta.paletteKey || "success";
                      return (
                        <Box
                          sx={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            bgcolor: `${paletteKey}._alpha.main_10`,
                            border: `1px solid ${paletteKey}._alpha.main_20`,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Box
                            sx={{
                              color: `${paletteKey}.main`,
                              display: "flex",
                            }}
                          >
                            {getStatusIcon(v.status || "COMPLETED")}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: `${paletteKey}.main`,
                              textTransform: "uppercase",
                            }}
                          >
                            {statusMeta.label}
                          </Typography>
                        </Box>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
};
