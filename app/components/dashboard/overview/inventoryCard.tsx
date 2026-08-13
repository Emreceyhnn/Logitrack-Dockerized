"use client";

import {
  Box,
  Divider,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from "@mui/material";
import CustomCard from "../../cards/card";
import { LowStockItemStat } from "@/app/lib/type/overview";
import InventoryIcon from "@mui/icons-material/Inventory";
import ErrorIcon from "@mui/icons-material/Error";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface AlertInventoryCardProps {
  inventory: LowStockItemStat[];
}

const AlertInventoryCard = ({ inventory = [] }: AlertInventoryCardProps) => {
  const dict = useDictionary();
  const theme = useTheme();

  return (
    <CustomCard
      sx={{
        padding: "0 0 6px 0",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        p={2}
      >
        <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
          {dict.dashboard.overview.inventoryAlerts.title}
        </Typography>
        {inventory.length > 0 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              bgcolor: theme.palette.error._alpha.main_10,
              color: "error.main",
              px: 1,
              py: 0.25,
              borderRadius: "12px",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            <ErrorIcon sx={{ fontSize: 14 }} />
            {dict.dashboard.overview.inventoryAlerts.itemCount.replace(
              "{count}",
              inventory.length.toString()
            )}
          </Box>
        )}
      </Stack>
      <Divider />

      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
        {inventory.length === 0 ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            height="100%"
            minHeight={150}
            spacing={2}
            sx={{ opacity: 0.5 }}
          >
            <InventoryIcon sx={{ fontSize: 40 }} />
            <Typography variant="body2">
              {dict.dashboard.overview.inventoryAlerts.healthy}
            </Typography>
          </Stack>
        ) : (
          <TableContainer sx={{ p: 0 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      bgcolor: theme.palette.primary._alpha.main_03,
                      borderColor: theme.palette.divider_alpha.main_10,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {dict.dashboard.overview.inventoryAlerts.table.item}
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: theme.palette.primary._alpha.main_03,
                      borderColor: theme.palette.divider_alpha.main_10,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {dict.dashboard.overview.inventoryAlerts.table.warehouse}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: theme.palette.primary._alpha.main_03,
                      borderColor: theme.palette.divider_alpha.main_10,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {dict.dashboard.overview.inventoryAlerts.table.qty}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: theme.palette.primary._alpha.main_03,
                      borderColor: theme.palette.divider_alpha.main_10,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {dict.dashboard.overview.inventoryAlerts.table.min}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={{ "& tr:last-child td": { border: 0 } }}>
                {inventory.map((i, index) => (
                  <TableRow
                    key={index}
                    hover
                    sx={{
                      "& td": {
                        borderColor: theme.palette.divider_alpha.main_10,
                      },
                    }}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="text.primary"
                      >
                        {i.item}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {i.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {i.warehouseId}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color="error.main"
                      >
                        {i.onHand}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {i.minStock}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </CustomCard>
  );
};

export default AlertInventoryCard;
