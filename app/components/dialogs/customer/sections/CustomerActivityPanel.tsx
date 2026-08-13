"use client";

import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { CustomerWithRelations } from "@/app/lib/type/customer";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useRouter } from "next/navigation";

interface CustomerActivityPanelProps {
  customer: CustomerWithRelations;
}

export default function CustomerActivityPanel({
  customer,
}: CustomerActivityPanelProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const router = useRouter();

  return (
    <Box sx={{ width: { xs: "100%", md: "65%" }, p: 3 }}>
      {/* KPI Cards */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box sx={{ flex: 1 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: theme.palette.primary._alpha.main_02,
              borderColor: theme.palette.primary._alpha.main_10,
            }}
          >
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                >
                  {dict.customers.totalShipments}
                </Typography>
                <LocalShippingIcon fontSize="small" color="primary" />
              </Stack>
              <Typography variant="h5" fontWeight={700}>
                {customer.shipments?.length || 0} ({dict.common.recent})
              </Typography>
            </Stack>
          </Paper>
        </Box>
      </Stack>

      {/* Recent Shipments */}
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography
            variant="overline"
            color="text.secondary"
            fontWeight={700}
            letterSpacing={1.2}
          >
            {dict.customers.recentShipments}
          </Typography>
          <Chip
            label={`${customer.shipments?.length || 0} ${dict.customers.records}`}
            size="small"
            sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600 }}
          />
        </Stack>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {customer.shipments?.map((shipment) => (
            <Paper
              key={shipment.id}
              variant="outlined"
              onClick={() => {
                if (shipment.routeId) {
                  router.push(`/dashboard/routes/${shipment.routeId}`);
                } else {
                  router.push(`/dashboard/shipments/${shipment.id}`);
                }
              }}
              sx={{
                p: 2,
                borderRadius: 2,
                cursor: "pointer",
                bgcolor: theme.palette.background.paper_alpha.main_02,
                borderColor: theme.palette.divider_alpha.main_05,
                "&:hover": {
                  borderColor: theme.palette.primary._alpha.main_20,
                  bgcolor: theme.palette.primary._alpha.main_02,
                },
              }}
            >
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" fontWeight={600}>
                  {shipment.trackingId}
                </Typography>
                <Chip
                  label={(dict.customers.activityStatus as Record<string, string>)?.[shipment.status] || shipment.status}
                  size="small"
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {(shipment.origin as { address?: string })?.address ||
                  (typeof shipment.origin === "string"
                    ? shipment.origin
                    : dict.common.na)}{" "}
                {" -> "}
                {(shipment.destination as { address?: string })?.address ||
                  (typeof shipment.destination === "string"
                    ? shipment.destination
                    : dict.common.na)}
              </Typography>
            </Paper>
          ))}
          {(!customer.shipments || customer.shipments.length === 0) && (
            <Typography variant="body2" color="text.secondary">
              {dict.customers.noRecentShipments}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
