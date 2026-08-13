"use client";

import { useState } from "react";
import { Box, Typography, Menu, MenuItem, ListItemIcon, ListItemText, Divider, useTheme, Pagination } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { CustomerWithRelations, CustomerListProps } from "@/app/lib/type/customer";
import CustomCard from "../../cards/card";
import CustomerListSkeleton from "./components/CustomerListSkeleton";
import CustomerListItem from "./components/CustomerListItem";

const CustomerList = ({ customers, selectedId, loading = false, onSelect, onEdit, onDelete, meta, onPageChange }: CustomerListProps) => {
  const dict = useDictionary();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuCustomer, setMenuCustomer] = useState<CustomerWithRelations | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, customer: CustomerWithRelations) => {
    event.stopPropagation(); setAnchorEl(event.currentTarget); setMenuCustomer(customer);
  };

  const handleMenuClose = () => { setAnchorEl(null); setMenuCustomer(null); };

  const handleAction = (action: string) => {
    if (!menuCustomer) return;
    if (action === "details") onSelect(menuCustomer.id);
    else if (action === "edit") onEdit?.(menuCustomer);
    else if (action === "delete") onDelete?.(menuCustomer);
    handleMenuClose();
  };

  const getIndustryLabel = (industry: string | null) => {
    if (!industry) return dict.customers.industryGeneral;
    const mapping: Record<string, keyof typeof dict.industries> = {
      "Logistics & Transportation": "logistics", "Retail & E-commerce": "retail", "E-commerce": "ecommerce",
      Manufacturing: "manufacturing", Pharmaceuticals: "pharmaceuticals", Automotive: "automotive",
      Aviation: "aviation", Technology: "technology", Other: "other",
    };
    const key = mapping[industry];
    return key ? dict.industries[key] : industry;
  };

interface ExtendedPalette {
  primary: {
    main: string;
    _alpha?: Record<string, string>;
  };
  kpi?: Record<string, string | Record<string, string>>;
  divider_alpha?: Record<string, string>;
}

  const getCustomerStyles = (name: string) => {
    const paletteTheme = theme.palette as unknown as ExtendedPalette;
    if (!name) return { main: theme.palette.primary.main, alpha: paletteTheme.primary?._alpha?.main_10 || "rgba(25, 118, 210, 0.1)" };
    let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const kpi = paletteTheme.kpi || {};
    const getKpiColor = (key: string) => (kpi[key] as string) || theme.palette.primary.main;
    const getKpiAlpha = (key: string) => (kpi[`${key}_alpha`] as Record<string, string>)?.main_20 || "rgba(25, 118, 210, 0.2)";

    const palette = [
      { main: getKpiColor("indigo"), alpha: getKpiAlpha("indigo") },
      { main: getKpiColor("sky"), alpha: getKpiAlpha("sky") },
      { main: getKpiColor("emerald"), alpha: getKpiAlpha("emerald") },
      { main: getKpiColor("amber"), alpha: getKpiAlpha("amber") },
      { main: getKpiColor("pink"), alpha: getKpiAlpha("pink") },
      { main: getKpiColor("violet"), alpha: getKpiAlpha("violet") },
      { main: getKpiColor("cyan"), alpha: getKpiAlpha("cyan") },
      { main: theme.palette.primary.main, alpha: paletteTheme.primary?._alpha?.main_20 || "rgba(25, 118, 210, 0.2)" },
    ];
    return palette[Math.abs(hash) % palette.length] ?? { main: theme.palette.primary.main, alpha: paletteTheme.primary?._alpha?.main_10 || "rgba(25, 118, 210, 0.1)" };
  };

  if (loading) return <CustomerListSkeleton theme={theme} />;

  const paletteTheme = theme.palette as unknown as ExtendedPalette;

  return (
    <CustomCard sx={{ width: 400, p: 0, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 0, flexGrow: 1, overflow: "auto" }}>
        {customers.map((customer) => (
          <CustomerListItem key={customer.id} customer={customer} selectedId={selectedId} onSelect={onSelect} handleMenuOpen={handleMenuOpen} getCustomerStyles={getCustomerStyles} getIndustryLabel={getIndustryLabel} dict={dict} theme={theme} />
        ))}
        {customers.length === 0 && (
          <Box p={4} textAlign="center"><Typography color="text.secondary">{dict.customers.list.noCustomers}</Typography></Box>
        )}
      </Box>

      {meta && (
        <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: paletteTheme.divider_alpha?.main_10, display: "flex", justifyContent: "center", bgcolor: "rgba(0,0,0,0.2)" }}>
          <Pagination count={Math.ceil(meta.total / meta.limit)} page={meta.page} onChange={(_, page) => onPageChange?.(page)} size="small" color="primary" siblingCount={0} boundaryCount={1} sx={{ "& .MuiPaginationItem-root": { fontSize: "0.75rem", height: 24, minWidth: 24, borderRadius: 1 } }} />
        </Box>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} transformOrigin={{ horizontal: "right", vertical: "top" }} anchorOrigin={{ horizontal: "right", vertical: "bottom" }} PaperProps={{ sx: { minWidth: 150, borderRadius: 2, mt: 0.5, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", border: `1px solid ${paletteTheme.divider_alpha?.main_10}`, bgcolor: theme.palette.background.paper } }}>
        <MenuItem onClick={() => handleAction("details")}><ListItemIcon><InfoIcon fontSize="small" color="info" /></ListItemIcon><ListItemText primary={dict.customers.actions.details} primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} /></MenuItem>
        <MenuItem onClick={() => handleAction("edit")}><ListItemIcon><EditIcon fontSize="small" /></ListItemIcon><ListItemText primary={dict.customers.actions.edit} primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} /></MenuItem>
        <Divider sx={{ my: 0.5, borderColor: paletteTheme.divider_alpha?.main_10 }} />
        <MenuItem onClick={() => handleAction("delete")} sx={{ color: "error.main" }}><ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon><ListItemText primary={dict.customers.actions.delete} primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} /></MenuItem>
      </Menu>
    </CustomCard>
  );
};

export default CustomerList;
