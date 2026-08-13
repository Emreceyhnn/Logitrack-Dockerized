import { Box, Stack, Typography, Paper, Divider, Avatar, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DriverCard from "@/app/components/cards/driverCard";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { ShipmentWithRelations, ShipmentStopWithRelations } from "@/app/lib/type/shipment";

interface ShipmentOverviewTabProps {
  shipment: ShipmentWithRelations;
  hasStops: boolean;
  stopsSorted: ShipmentStopWithRelations[];
}

export const ShipmentOverviewTab = ({
  shipment,
  hasStops,
  stopsSorted,
}: ShipmentOverviewTabProps) => {
  const theme = useTheme();
  const dict = useDictionary();

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
      }}
    >
      <Stack spacing={3}>
        {/* Driver */}
        <Stack spacing={1.5}>
          <Typography
            variant="overline"
            color="text.secondary"
            fontWeight={700}
            sx={{ opacity: 0.6 }}
          >
            {dict.shipments.details.assignmentDetails}
          </Typography>
          {shipment.driver ? (
            <DriverCard {...shipment.driver} />
          ) : (
            <Paper
              sx={{
                p: 2,
                bgcolor: theme.palette.action.hover,
                border: `1px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                textAlign: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {dict.shipments.details.noDriverAssigned}
              </Typography>
            </Paper>
          )}
        </Stack>

        <Divider
          sx={{ borderColor: theme.palette.divider, flexShrink: 0 }}
        />

        {/* Mission Path */}
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: "primary.main",
              }}
            />
            <Typography
              variant="overline"
              color="text.secondary"
              fontWeight={700}
              sx={{ opacity: 0.6 }}
            >
              {dict.shipments.details.missionPath}
            </Typography>
          </Stack>

          <Box sx={{ position: "relative" }}>
            <Stack
              spacing={4}
              sx={{ position: "relative", pl: 5.5, py: 1 }}
            >
              {/* Continuous Vertical Line */}
              <Box
                sx={{
                  position: "absolute",
                  left: 16,
                  top: 10,
                  bottom: 10,
                  width: "2px",
                  bgcolor: theme.palette.divider,
                  opacity: 0.5,
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `linear-gradient(to bottom, ${theme.palette.primary.main} 0%, ${theme.palette.info.main} 50%, ${theme.palette.secondary.main} 100%)`,
                    opacity: 0.3,
                  },
                }}
              />

              {/* 1. Origin (Warehouse) */}
              <Box sx={{ position: "relative" }}>
                <Box
                  sx={{
                    position: "absolute",
                    left: -44,
                    top: 0,
                    width: 32,
                    height: 32,
                    borderRadius: "10px",
                    bgcolor: theme.palette.primary.main,
                    border: `4px solid ${theme.palette.background.default}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    zIndex: 1,
                    boxShadow: theme.shadows[4],
                  }}
                >
                  <BusinessIcon sx={{ fontSize: 16 }} />
                </Box>
                <Stack spacing={0.25}>
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color="primary.main"
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {dict.shipments.details.pickupOrigin}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color="text.primary"
                  >
                    {shipment.origin || dict.common.noData}
                  </Typography>
                </Stack>
              </Box>

              {/* 2. Intermediate Stops — all ShipmentStop records */}
              {hasStops &&
                stopsSorted.map((stop, index) => (
                  <Box key={stop.id} sx={{ position: "relative" }}>
                    <Box
                      sx={{
                        position: "absolute",
                        left: -44,
                        top: 0,
                        width: 32,
                        height: 32,
                        borderRadius: "10px",
                        bgcolor: theme.palette.info.main,
                        border: `4px solid ${theme.palette.background.default}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        zIndex: 1,
                        fontSize: "0.75rem",
                        fontWeight: 900,
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Stack spacing={0.25}>
                      <Typography
                        variant="caption"
                        fontWeight={800}
                        color="info.main"
                        sx={{
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {dict.shipments.dialogs.sections.stop ||
                          "Stop"}{" "}
                        {index + 1}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="text.primary"
                      >
                        {stop.address}
                      </Typography>
                    </Stack>
                  </Box>
                ))}

              {/* 3. Final Destination */}
              <Box sx={{ position: "relative" }}>
                <Box
                  sx={{
                    position: "absolute",
                    left: -44,
                    top: 0,
                    width: 32,
                    height: 32,
                    borderRadius: "10px",
                    bgcolor: theme.palette.secondary.main,
                    border: `4px solid ${theme.palette.background.default}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    zIndex: 1,
                    boxShadow: theme.shadows[4],
                  }}
                >
                  <LocationOnIcon sx={{ fontSize: 18 }} />
                </Box>
                <Stack spacing={0.25}>
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color="secondary.main"
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {dict.shipments.details.finalDelivery}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color="text.primary"
                  >
                    {shipment.destination || dict.common.noData}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Stack>

        <Divider
          sx={{ borderColor: theme.palette.divider, flexShrink: 0 }}
        />

        {/* Specs grid */}
        <Stack spacing={1.5} sx={{ flexShrink: 0 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            fontWeight={700}
            sx={{ opacity: 0.6 }}
          >
            {dict.shipments.details.consignmentSpecs}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: "16px",
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={0.5}
              >
                {dict.shipments.details.quantity}
              </Typography>
              <Typography
                component="div"
                variant="h6"
                fontWeight={700}
                color="text.primary"
              >
                {shipment.itemsCount || 0}{" "}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                >
                  {dict.shipments.details.units}
                </Typography>
              </Typography>
            </Box>

            {Boolean(shipment.weightKg && shipment.weightKg > 0) && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: "16px",
                  bgcolor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  mb={0.5}
                >
                  {dict.shipments.details.grossWeight}
                </Typography>
                <Typography
                  component="div"
                  variant="h6"
                  fontWeight={700}
                  color="text.primary"
                >
                  {(shipment.weightKg ?? 0).toFixed(2)}{" "}
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                  >
                    {dict.shipments.details.kg}
                  </Typography>
                </Typography>
              </Box>
            )}
          </Box>
        </Stack>

        <Divider
          sx={{ borderColor: theme.palette.divider, flexShrink: 0 }}
        />

        {/* Customer */}
        <Stack spacing={1.5} sx={{ flexShrink: 0 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            fontWeight={700}
            sx={{ opacity: 0.6 }}
          >
            {dict.shipments.details.customerEntity}
          </Typography>
          {shipment.customer ? (
            <Stack
              direction="row"
              spacing={2}
              sx={{
                p: 2,
                borderRadius: "14px",
                bgcolor: theme.palette.action.hover,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  width: 40,
                  height: 40,
                  borderRadius: "10px",
                }}
              >
                <BusinessIcon />
              </Avatar>
              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="text.primary"
                >
                  {shipment.customer.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {dict.shipments.details.clientPartner}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Paper
              sx={{
                p: 2,
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "14px",
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="text.primary"
              >
                {dict.shipments.details.directConsignment ||
                  "Custom Shipment"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dict.shipments.details.oneTimeService ||
                  "One-time direct service"}
              </Typography>
            </Paper>
          )}
        </Stack>
      </Stack>
    </motion.div>
  );
};
