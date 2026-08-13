import { Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton, ListItemText, Button } from "@mui/material";
import { InventoryWithRelations } from "@/app/lib/type/inventory";
import { Dictionary } from "@/app/lib/language/language";

interface ExtendedPalette {
  divider_alpha?: Record<string, string>;
  primary?: {
    _alpha?: Record<string, string>;
  };
}

interface InventoryPickerModalProps {
  open: boolean;
  onClose: () => void;
  availableInventory: InventoryWithRelations[];
  dict: Dictionary;
  selectProduct: (product: InventoryWithRelations) => void;
}

export default function InventoryPickerModal({ open, onClose, availableInventory, dict, selectProduct }: InventoryPickerModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, border: (theme) => `1px solid ${(theme.palette as unknown as ExtendedPalette).divider_alpha?.main_10}` } }}>
      <DialogTitle sx={{ color: "text.primary", fontWeight: 700 }}>
        {dict.shipments.dialogs.fields.warehouseInventory}
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: (theme) => (theme.palette as unknown as ExtendedPalette).divider_alpha?.main_10 }}>
        <List>
          {availableInventory.map((product) => (
            <ListItem key={product.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton onClick={() => selectProduct(product)} sx={{ borderRadius: 2, "&:hover": { bgcolor: (theme) => (theme.palette as unknown as ExtendedPalette).primary?._alpha?.main_10 } }}>
                <ListItemText
                  primary={product.name}
                  secondary={`SKU: ${product.sku} | In Stock: ${product.quantity} | U/Pallet: ${product.palletCount}`}
                  primaryTypographyProps={{ color: "text.primary", fontWeight: 600 }}
                  secondaryTypographyProps={{ color: "text.secondary" }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: "text.secondary" }}>
          {dict.common.cancel || "Cancel"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
