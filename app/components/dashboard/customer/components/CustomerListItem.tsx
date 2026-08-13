"use client";

import { Box, Stack, Typography, Avatar, IconButton, Chip, Tooltip, Theme } from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { CustomerWithRelations } from "@/app/lib/type/customer";
import { Dictionary } from "@/app/lib/language/language";

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
}

export interface CustomerListItemProps {
  customer: CustomerWithRelations;
  selectedId: string | null;
  onSelect: (id: string) => void;
  handleMenuOpen: (event: React.MouseEvent<HTMLElement>, customer: CustomerWithRelations) => void;
  getCustomerStyles: (name: string) => { main: string; alpha: string };
  getIndustryLabel: (industry: string | null) => string;
  dict: Dictionary;
  theme: Theme;
}

export default function CustomerListItem({ customer, selectedId, onSelect, handleMenuOpen, getCustomerStyles, getIndustryLabel, dict, theme }: CustomerListItemProps) {
  const styles = getCustomerStyles(customer.name);
  const paletteTheme = theme.palette as unknown as ExtendedPalette;
  return (
    <Box
      onClick={() => onSelect(customer.id)}
      sx={{
        p: 2, borderBottom: "1px solid", borderColor: paletteTheme.divider_alpha?.main_10, cursor: "pointer",
        bgcolor: selectedId === customer.id ? paletteTheme.primary?._alpha?.main_08 : "transparent",
        "&:hover": { bgcolor: paletteTheme.primary?._alpha?.main_10, transition: "background-color 0.2s" }, transition: "background-color 0.2s",
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
        <Avatar variant="rounded" sx={{ bgcolor: styles.alpha, color: styles.main, width: 40, height: 40, fontSize: "1rem", fontWeight: 800, border: `1px solid ${styles.alpha}` }}>
          {customer.name.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Tooltip title={customer.name} arrow placement="top-start">
              <Typography variant="subtitle1" fontWeight={600} lineHeight={1.2} noWrap>{customer.name}</Typography>
            </Tooltip>
            <Tooltip title={dict.common.tooltips.actions} arrow>
              <IconButton size="medium" onClick={(e) => handleMenuOpen(e, customer)} sx={{ p: 1, mt: -1, mr: -1, "&:hover": { bgcolor: "action.hover" } }}>
                <MoreVertIcon fontSize="medium" sx={{ color: "text.secondary" }} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {customer.code} • {getIndustryLabel(customer.industry || null)}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={0.5} sx={{ mt: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={dict.customers.fields.address} arrow placement="left">
            <LocationOnIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          </Tooltip>
          <Typography variant="body2" color="text.secondary" noWrap>
            {customer.locations && customer.locations.length > 0 ? customer.locations.find((l: { isDefault: boolean; address: string }) => l.isDefault)?.address || customer.locations[0]?.address : dict.customers.list.noAddress}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={dict.customers.fields.phone} arrow placement="left">
            <PhoneIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          </Tooltip>
          <Typography variant="body2" color="text.secondary">
            {customer.phone || dict.customers.list.na}
          </Typography>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Chip label={dict.customers.list.shipmentsCount.replace("{count}", (customer._count?.shipments ?? 0).toString())} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600, borderColor: paletteTheme.divider_alpha?.main_10 }} />
      </Stack>
    </Box>
  );
}
