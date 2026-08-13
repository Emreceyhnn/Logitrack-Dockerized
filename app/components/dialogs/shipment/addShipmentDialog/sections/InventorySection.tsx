import { Button, Stack, Typography, CircularProgress, Box } from "@mui/material";
import { useFormikContext } from "formik";
import { ShipmentFormValues } from "@/app/lib/type/shipment";
import { InventoryShipmentItem } from "@/app/lib/type/add-shipment";
import { InventoryWithRelations } from "@/app/lib/type/inventory";
import AddIcon from "@mui/icons-material/Add";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import InventoryIcon from "@mui/icons-material/Inventory";
import { useState } from "react";
import InventoryPickerModal from "./InventoryPickerModal";
import InventoryItemRow from "./InventoryItemRow";

interface ExtendedPalette {
  divider_alpha?: Record<string, string>;
}

interface InventorySectionProps {
  availableInventory: InventoryWithRelations[];
  isLoadingInventory: boolean;
}

const InventorySection = ({ availableInventory, isLoadingInventory }: InventorySectionProps) => {
  const dict = useDictionary();
  const { values, setFieldValue } = useFormikContext<ShipmentFormValues>();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const calculateTotals = (items: InventoryShipmentItem[]) => {
    return items.reduce((acc, item) => {
      const qty = item.quantity || 0;
      const perPallet = item.palletCount || 0;
      const unitWeight = item.weightKg || 0;
      const unitVolume = item.volumeM3 || 0;

      let itemTotalWeight = 0;
      let itemTotalVolume = 0;
      let itemTotalPallets = 0;

      if (item.unit === "Pallet") {
        itemTotalPallets = qty;
        itemTotalWeight = Math.abs(unitWeight) * perPallet * qty;
        itemTotalVolume = Math.abs(unitVolume) * perPallet * qty;
      } else {
        const isWarehouseProduct = item.maxQuantity !== undefined;
        itemTotalPallets = isWarehouseProduct && perPallet > 0 ? qty / perPallet : 0;
        itemTotalWeight = Math.abs(unitWeight) * qty;
        itemTotalVolume = Math.abs(unitVolume) * qty;
      }

      return { weightKg: acc.weightKg + itemTotalWeight, volumeM3: acc.volumeM3 + itemTotalVolume, palletCount: acc.palletCount + itemTotalPallets };
    }, { weightKg: 0, volumeM3: 0, palletCount: 0 });
  };

  const handleAddItem = () => {
    const newItem: InventoryShipmentItem = { id: crypto.randomUUID(), sku: "", name: "", quantity: 1, unit: "Each", weightKg: 0, volumeM3: 0, palletCount: 1 };
    setFieldValue("inventoryItems", [...values.inventoryItems, newItem]);
  };

  const selectProduct = (product: InventoryWithRelations) => {
    const newItem: InventoryShipmentItem = {
      id: crypto.randomUUID(), sku: product.sku, name: product.name, quantity: 1, maxQuantity: product.quantity,
      unit: product.unit === "Pallet" ? "Pallet" : "Each", weightKg: Math.abs(product.weightKg || 0), volumeM3: Math.abs(product.volumeM3 || 0),
      palletCount: product.palletCount || 1, cargoType: product.cargoType || "General Cargo",
    };
    const newItems = [...values.inventoryItems, newItem];
    setFieldValue("inventoryItems", newItems);
    const totals = calculateTotals(newItems);
    setFieldValue("weightKg", totals.weightKg);
    setFieldValue("volumeM3", totals.volumeM3);
    if (totals.palletCount > 0) {
      setFieldValue("palletCount", Math.ceil(totals.palletCount));
    }
    if (newItem.cargoType) setFieldValue("cargoType", newItem.cargoType);
    setIsPickerOpen(false);
  };

  const updateItem = (id: string, updates: Partial<InventoryShipmentItem>) => {
    const updatedItems = values.inventoryItems.map((item) => (item.id === id ? { ...item, ...updates } : item));
    setFieldValue("inventoryItems", updatedItems);
    const totals = calculateTotals(updatedItems);
    setFieldValue("weightKg", totals.weightKg);
    setFieldValue("volumeM3", totals.volumeM3);
    if (totals.palletCount > 0) {
      setFieldValue("palletCount", Math.ceil(totals.palletCount));
    }
  };

  const handleRemove = (id: string) => {
    const updatedItems = values.inventoryItems.filter((item) => item.id !== id);
    setFieldValue("inventoryItems", updatedItems);
    const totals = calculateTotals(updatedItems);
    setFieldValue("weightKg", totals.weightKg);
    setFieldValue("volumeM3", totals.volumeM3);
    if (totals.palletCount > 0) {
      setFieldValue("palletCount", Math.ceil(totals.palletCount));
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main" }} />
            <Typography variant="subtitle2" fontWeight={700} color="white">{dict.shipments.dialogs.sections.inventoryDetail}</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button startIcon={isLoadingInventory ? <CircularProgress size={16} color="inherit" /> : <InventoryIcon sx={{ fontSize: 18 }} />} size="small" onClick={() => setIsPickerOpen(true)} disabled={isLoadingInventory || availableInventory.length === 0} sx={{ color: "primary.main", fontWeight: 600, textTransform: "none" }}>{dict.shipments.dialogs.fields.warehouse}</Button>
            <Button startIcon={<AddIcon />} size="small" onClick={handleAddItem} sx={{ color: "text.secondary", fontWeight: 600, textTransform: "none" }}>{dict.shipments.dialogs.fields.manual}</Button>
          </Stack>
        </Stack>

        {values.inventoryItems.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center", borderRadius: 2, border: (theme) => `1px dashed ${(theme.palette as unknown as ExtendedPalette).divider_alpha?.main_10}`, bgcolor: (theme) => (theme.palette as unknown as ExtendedPalette).divider_alpha?.main_02 }}>
            <Typography variant="body2" color="text.secondary">{dict.shipments.dialogs.fields.noItemsAdded}</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1.5} sx={{ mb: 1, px: 2 }}>
              <Box sx={{ flex: 3 }}><Typography variant="caption" fontWeight={700} color="text.secondary">{dict.shipments.dialogs.fields.skuId}</Typography></Box>
              <Box sx={{ flex: 5.5 }}><Typography variant="caption" fontWeight={700} color="text.secondary">{dict.shipments.dialogs.fields.itemName}</Typography></Box>
              <Box sx={{ flex: 1.5 }}><Typography variant="caption" fontWeight={700} color="text.secondary">{dict.shipments.dialogs.fields.qty}</Typography></Box>
              <Box sx={{ flex: 1.5 }}><Typography variant="caption" fontWeight={700} color="text.secondary">{dict.shipments.dialogs.fields.unit}</Typography></Box>
              <Box sx={{ width: 40 }} />
            </Stack>
            {values.inventoryItems.map((item) => (
              <InventoryItemRow key={item.id} item={item} dict={dict} updateItem={updateItem} handleRemove={handleRemove} />
            ))}
          </Stack>
        )}
      </Stack>

      <InventoryPickerModal open={isPickerOpen} onClose={() => setIsPickerOpen(false)} availableInventory={availableInventory} dict={dict} selectProduct={selectProduct} />
    </Box>
  );
};

export default InventorySection;
