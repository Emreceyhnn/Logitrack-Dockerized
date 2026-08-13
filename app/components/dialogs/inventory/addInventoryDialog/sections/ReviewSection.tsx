"use client";

import {
  
  Box,
  Divider,
  Grid,
  Stack,
  Typography,
  useTheme,
  Avatar,
} from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import {
  AddInventoryItemDetails,
  AddInventoryStorageLevels,
} from "@/app/lib/type/add-inventory";
import InventoryIcon from "@mui/icons-material/Inventory";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import InfoIcon from "@mui/icons-material/Info";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

interface ReviewSectionProps {
  itemDetails: AddInventoryItemDetails;
  storageLevels: AddInventoryStorageLevels;
}

import { useParams } from "next/navigation";

const InfoRow = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    sx={{ py: 1 }}
  >
    <Stack direction="row" spacing={1} alignItems="center">
      {icon && (
        <Box sx={{ color: "text.secondary", opacity: 0.6, display: "flex" }}>
          {icon}
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" fontWeight={500}>
        {label}
      </Typography>
    </Stack>
    <Typography variant="body2" color="white" fontWeight={600}>
      {value}
    </Typography>
  </Stack>
);

const ReviewSection = ({ itemDetails, storageLevels }: ReviewSectionProps) => {
  const dict = useDictionary();
  const theme = useTheme();
  const params = useParams();
  const lang = (params?.lang as string) || "en";

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", {
      style: "currency",
      currency: lang === "tr" ? "TRY" : "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Box>
      <Stack spacing={3}>
        {/* Header Summary */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: theme.palette.primary._alpha.main_05,
            border: `1px solid ${theme.palette.primary._alpha.main_10}`,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {itemDetails.imageUrl ? (
            <Avatar
              src={itemDetails.imageUrl}
              variant="rounded"
              sx={{ width: 64, height: 64, borderRadius: 2 }}
            />
          ) : (
            <Avatar
              variant="rounded"
              sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: theme.palette.primary._alpha.main_10, color: theme.palette.primary.main }}
            >
              <InventoryIcon sx={{ fontSize: 32 }} />
            </Avatar>
          )}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="white">
              {itemDetails.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {itemDetails.category} • {dict.inventory.fields.sku}: {itemDetails.sku || dict.common.noData}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <InfoIcon sx={{ fontSize: "1rem", color: theme.palette.primary.main }} />
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 1 }}>
                   {dict.inventory.dialogs.steps.details.toLocaleUpperCase('en-US')}
                </Typography>
              </Stack>
              <Box>
                <InfoRow label={dict.inventory.fields.unitValue} value={formatPrice(itemDetails.unitValue || 0)} />
                <Divider sx={{ borderColor: theme.palette.divider_alpha.main_05 }} />
                <InfoRow label={dict.inventory.fields.weight} value={`${itemDetails.weightKg || 0} ${dict.common.units.kg}`} />
                <Divider sx={{ borderColor: theme.palette.divider_alpha.main_05 }} />
                <InfoRow label={dict.inventory.fields.volume} value={`${itemDetails.volumeM3 || 0} ${dict.common.units.m3}`} />
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <WarehouseIcon sx={{ fontSize: "1rem", color: theme.palette.primary.main }} />
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 1 }}>
                  {dict.inventory.header.toLocaleUpperCase('en-US')}
                </Typography>
              </Stack>
              <Box>
                <InfoRow label={dict.inventory.fields.quantity} value={storageLevels.initialQuantity || 0} />
                <Divider sx={{ borderColor: theme.palette.divider_alpha.main_05 }} />
                <InfoRow label={dict.inventory.fields.minStock} value={storageLevels.minStockLevel || 0} />
                <Divider sx={{ borderColor: theme.palette.divider_alpha.main_05 }} />
                <InfoRow
                  label={dict.warehouses.dialogs.zones.code}
                  value={storageLevels.zone || dict.warehouses.dialogs.fields.unassigned}
                />
                <Divider sx={{ borderColor: theme.palette.divider_alpha.main_05 }} />
                <InfoRow label={dict.inventory.fields.pallets} value={itemDetails.palletCount || 0} />
              </Box>
            </Stack>
          </Grid>
        </Grid>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: theme.palette.info._alpha.main_03,
            border: `1px solid ${theme.palette.info._alpha.main_05}`,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <LocalShippingIcon sx={{ color: theme.palette.info.main, fontSize: "1.1rem" }} />
          <Typography variant="caption" color="text.secondary">
            {dict.common.lastUpdated}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default ReviewSection;
