import { Box, Stack, Typography, Divider, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { ShipmentItem } from "@/app/lib/type/enums";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface ShipmentItemsTabProps {
  items: ShipmentItem[];
}

export const ShipmentItemsTab = ({ items }: ShipmentItemsTabProps) => {
  const theme = useTheme();
  const dict = useDictionary();

  return (
    <motion.div
      key="items"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      <Stack
        spacing={0}
        sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        {/* Summary header */}
        {items.length > 0 && (
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: "background.paper",
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack direction="row" spacing={3}>
              <Stack spacing={0.25}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    fontSize: "0.65rem",
                    letterSpacing: "0.06em",
                    opacity: 0.6,
                  }}
                >
                  {dict.shipments.details.itemsTab.totalItems}
                </Typography>
                <Typography
                  component="div"
                  variant="h6"
                  fontWeight={700}
                  color="text.primary"
                >
                  {items.reduce((s, i) => s + i.quantity, 0)}
                </Typography>
              </Stack>
              {Boolean(items.some((i) => i.weightKg && i.weightKg > 0)) && (
                <>
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{
                      borderColor: theme.palette.divider,
                    }}
                  />
                  <Stack spacing={0.25}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        textTransform: "uppercase",
                        fontSize: "0.65rem",
                        letterSpacing: "0.06em",
                        opacity: 0.6,
                      }}
                    >
                      {dict.shipments.details.itemsTab.totalWeight}
                    </Typography>
                    <Typography
                      component="div"
                      variant="h6"
                      fontWeight={700}
                      color="text.primary"
                    >
                      {items
                        .reduce(
                          (s, i) =>
                            s + (i.weightKg || 0) * i.quantity,
                          0
                        )
                        .toFixed(1)}{" "}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        kg
                      </Typography>
                    </Typography>
                  </Stack>
                </>
              )}
            </Stack>
          </Box>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={2}
            sx={{ py: 8, px: 3 }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "16px",
                bgcolor: theme.palette.action.hover,
                border: `1px solid ${theme.palette.divider}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Inventory2OutlinedIcon
                sx={{
                  fontSize: 24,
                  color: "text.secondary",
                  opacity: 0.2,
                }}
              />
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ opacity: 0.5 }}
            >
              {dict.shipments.details.itemsTab.noItems}
            </Typography>
          </Stack>
        )}

        {/* Item rows */}
        {items.map((item, idx) => (
          <Box key={item.id}>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{
                px: 3,
                py: 2,
                transition: "background 0.15s",
                "&:hover": {
                  bgcolor: theme.palette.action.hover,
                },
              }}
            >
              {/* Index */}
              <Typography
                variant="caption"
                fontWeight={800}
                sx={{
                  width: 20,
                  color: "text.secondary",
                  opacity: 0.3,
                  fontSize: "0.65rem",
                  flexShrink: 0,
                }}
              >
                {String(idx + 1).padStart(2, "0")}
              </Typography>

              {/* Name + SKU */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="text.primary"
                  noWrap
                >
                  {item.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontFamily: "monospace",
                    fontSize: "0.68rem",
                    opacity: 0.5,
                  }}
                >
                  {item.sku}
                </Typography>
              </Box>

              {/* Qty */}
              <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: "0.6rem",
                    textTransform: "uppercase",
                    opacity: 0.5,
                  }}
                >
                  {dict.shipments.details.itemsTab.qty}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color="text.primary"
                >
                  {item.quantity}
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    ml={0.3}
                  >
                    {item.unit}
                  </Typography>
                </Typography>
              </Stack>

              {/* Weight */}
              {Boolean(item.weightKg && item.weightKg > 0) && (
                <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: "0.6rem",
                      textTransform: "uppercase",
                      opacity: 0.5,
                    }}
                  >
                    {dict.shipments.details.itemsTab.weight}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color="text.primary"
                  >
                    {((item.weightKg ?? 0) * item.quantity).toFixed(1)}
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      ml={0.3}
                    >
                      kg
                    </Typography>
                  </Typography>
                </Stack>
              )}
            </Stack>

            {idx < items.length - 1 && (
              <Divider
                sx={{
                  borderColor: theme.palette.divider,
                  mx: 3,
                }}
              />
            )}
          </Box>
        ))}
      </Stack>
    </motion.div>
  );
};
