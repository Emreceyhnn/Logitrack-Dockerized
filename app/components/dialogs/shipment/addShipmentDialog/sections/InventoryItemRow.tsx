import { Box, Stack, Typography, MenuItem, IconButton } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import { InventoryShipmentItem } from "@/app/lib/type/add-shipment";

import { Dictionary } from "@/app/lib/language/language";

interface ExtendedPalette {
  error?: {
    _alpha?: Record<string, string>;
  };
}

interface InventoryItemRowProps {
  item: InventoryShipmentItem;
  dict: Dictionary;
  updateItem: (id: string, updates: Partial<InventoryShipmentItem>) => void;
  handleRemove: (id: string) => void;
}

export default function InventoryItemRow({ item, dict, updateItem, handleRemove }: InventoryItemRowProps) {
  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1, mb: 1 }}>
        <Box sx={{ flex: 3 }}>
          <CustomTextArea sx={{ margin: 0, padding: 0 }} name={`sku-${item.id}`} placeholder="SKU" value={item.sku} onChange={(e) => updateItem(item.id, { sku: e.target.value })} />
        </Box>
        <Box sx={{ flex: 5.5 }}>
          <CustomTextArea sx={{ margin: 0, padding: 0 }} name={`name-${item.id}`} placeholder="Name" value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} />
        </Box>
        <Box sx={{ flex: 1.5 }}>
          <CustomTextArea sx={{ margin: 0, padding: 0 }} name={`qty-${item.id}`} type="number" value={item.quantity.toString()} onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })} />
        </Box>
        <Box sx={{ flex: 1.5 }}>
          <CustomTextArea sx={{ margin: 0, padding: 0 }} name={`unit-${item.id}`} select value={item.unit} onChange={(e) => updateItem(item.id, { unit: e.target.value as InventoryShipmentItem["unit"] })}>
            <MenuItem value="Each">{dict.shipments.dialogs.types.each}</MenuItem>
            <MenuItem value="Box">{dict.shipments.dialogs.types.box}</MenuItem>
            <MenuItem value="Pallet">{dict.shipments.dialogs.types.pallet}</MenuItem>
          </CustomTextArea>
        </Box>
        <Box sx={{ width: 40, display: "flex", justifyContent: "start" }}>
          <IconButton size="small" onClick={() => handleRemove(item.id)} sx={{ p: 0.5, color: "text.secondary", "&:hover": { color: "error.main" } }}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      </Stack>

      <Stack direction="row" spacing={3} alignItems="center" sx={{ px: 1.5, mb: 1.5 }}>
        <Stack direction="row" spacing={3}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "10px" }}>
            {dict.shipments.dialogs.fields.calculatedPallets}:{" "}
            <b>
              {item.unit === "Pallet"
                ? item.quantity
                : item.maxQuantity !== undefined && item.palletCount && item.palletCount > 0
                  ? (item.quantity / item.palletCount).toFixed(2)
                  : "--"}
            </b>
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "10px" }}>
            {dict.shipments.dialogs.fields.rowWeight}:{" "}
            <b>
              {(item.unit === "Pallet" ? (item.weightKg || 0) * (item.palletCount || 0) * item.quantity : (item.weightKg || 0) * item.quantity).toFixed(2)} KG
            </b>
          </Typography>
        </Stack>

        {item.maxQuantity !== undefined && (
          <Box sx={{ ml: "auto" }}>
            {(() => {
              const isPallet = item.unit === "Pallet";
              const available = isPallet ? (item.palletCount && item.palletCount > 0 ? Math.floor(item.maxQuantity / item.palletCount) : 0) : item.maxQuantity;
              const isOverStock = item.quantity > available;
              if (isOverStock) {
                return (
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "error.main", bgcolor: (theme) => (theme.palette as unknown as ExtendedPalette).error?._alpha?.main_10, px: 1, py: 0.5, borderRadius: 1.5, border: (theme) => `1px solid ${(theme.palette as unknown as ExtendedPalette).error?._alpha?.main_20}` }}>
                    <Typography variant="caption" fontWeight={800} sx={{ fontSize: "10px", textTransform: "uppercase" }}>
                      {dict.shipments.dialogs.fields.insufficientStock}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600 }}>
                      ({dict.shipments.dialogs.fields.availableStock}: <Box component="span" sx={{ color: "error.main", fontWeight: 900 }}>{available} {isPallet ? dict.shipments.dialogs.types.pallet || "Pallet" : dict.shipments.dialogs.types.each || "Each"}</Box>)
                    </Typography>
                  </Stack>
                );
              }
              return null;
            })()}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
