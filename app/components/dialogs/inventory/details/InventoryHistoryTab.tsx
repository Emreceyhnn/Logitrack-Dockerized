"use client";

import {
  Box,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  useTheme,
} from "@mui/material";
import {
  History as HistoryIcon,
  TrendingDown as OutIcon,
  TrendingUp as InIcon,
  Build as AdjustIcon,
} from "@mui/icons-material";
import type { InventoryMovement } from "@/app/lib/type/inventory";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDateTime } from "@/app/lib/utils/date";

interface InventoryHistoryTabProps {
  movements: InventoryMovement[];
  loading: boolean;
}

function getMovementIcon(type: string) {
  switch (type) {
    case "PICK":
    case "SHIPMENT":
    case "ALLOCATION":
      return <OutIcon sx={{ color: "error.main" }} />;
    case "PUTAWAY":
    case "SHIPMENT_REVERT":
    case "SHIPMENT_CANCEL":
    case "ALLOCATION_REVERT":
    case "ALLOCATION_CANCEL":
      return <InIcon sx={{ color: "success.main" }} />;
    default:
      return <AdjustIcon sx={{ color: "info.main" }} />;
  }
}

/** History tab of the inventory details dialog: movement ledger table. */
export default function InventoryHistoryTab({
  movements,
  loading,
}: InventoryHistoryTabProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const dateSettings = useDateSettings();

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 300,
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (movements.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
          color: "text.secondary",
        }}
      >
        <HistoryIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
        <Typography variant="body2">
          {dict.inventory.dialogs.noHistory}
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer sx={{ maxHeight: 400 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow
            sx={{
              "& th": {
                bgcolor: theme.palette.background.paper_alpha.main_10,
                color: "text.secondary",
                fontWeight: 700,
                fontSize: "0.7rem",
                borderBottom: `1px solid ${theme.palette.divider_alpha.main_10}`,
              },
            }}
          >
            <TableCell>{dict.inventory.dialogs.historyFields.type}</TableCell>
            <TableCell align="right">
              {dict.inventory.dialogs.historyFields.quantity}
            </TableCell>
            <TableCell>
              {dict.inventory.dialogs.historyFields.notes || "Notes"}
            </TableCell>
            <TableCell>{dict.inventory.dialogs.historyFields.user}</TableCell>
            <TableCell align="right">
              {dict.inventory.dialogs.historyFields.date}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {movements.map((move) => (
            <TableRow
              key={move.id}
              sx={{
                "& td": {
                  color: "text.secondary",
                  borderColor: theme.palette.divider_alpha.main_05,
                },
              }}
            >
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  {getMovementIcon(move.type)}
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.primary",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {(
                      dict.inventory.dialogs.historyTypes as Record<
                        string,
                        string
                      >
                    )?.[move.type] || move.type}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  sx={{
                    color:
                      move.quantity > 0 ? "success.light" : "error.light",
                    fontWeight: 700,
                  }}
                >
                  {move.quantity > 0 ? `+${move.quantity}` : move.quantity}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", fontStyle: "italic" }}
                >
                  {move.notes || "-"}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption">
                  {move.user
                    ? `${move.user.name} ${move.user.surname}`
                    : dict.inventory.dialogs.historyFields.system}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="caption">
                  {formatDisplayDateTime(move.date, dateSettings)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
