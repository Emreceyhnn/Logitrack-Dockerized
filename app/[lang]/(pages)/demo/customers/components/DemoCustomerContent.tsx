"use client";

import {
  Box,
  Card,
  Stack,
  TextField,
  InputAdornment,
  Paper,
  Typography,
  Button,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import CustomerList from "@/app/components/dashboard/customer/CustomerList";
import CustomerDetailDialog from "@/app/components/dialogs/customer/customerDetailDialog";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import { useState, useMemo, useCallback } from "react";
import { CustomerWithRelations } from "@/app/lib/type/customer";
import { useDemoCustomersWithDashboard } from "@/app/hooks/demo/useDemoCustomers";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { toast } from "sonner";
import dynamic from "next/dynamic";
const MapWithMarkers = dynamic(
  () => import("@/app/components/valhalla/mapWithMarker"),
  {
    ssr: false,
  }
);

/**
 * Demo-only counterpart to CustomerContent — same list/map/search layout,
 * backed by the fixed demo dataset. Selecting a customer opens the real,
 * read-only CustomerDetailDialog, fed the mock record directly so it never
 * calls the authenticated getCustomerById action. Add/Edit/Delete still only
 * show a "disabled in demo" toast; no mutation dialog is mounted.
 */
export default function DemoCustomerContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const dict = useDictionary();

  /* ---------------------------------- STATE --------------------------------- */
  const [filters, setFilters] = useState<{ search: string }>({ search: "" });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: dashboardData,
    isLoading,
    isError,
    refetch,
  } = useDemoCustomersWithDashboard();

  /* --------------------------------- ACTIONS -------------------------------- */
  const notifyDisabled = useCallback(() => {
    toast.info(dict.toasts.demoActionDisabled);
  }, [dict]);

  const updateFilters = useCallback(
    (newFilters: Partial<{ search: string }>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    []
  );

  const handleSelect = useCallback((id: string) => {
    if (!id) return;
    setSelectedCustomerId(id);
    setDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setSelectedCustomerId(null);
  }, []);

  /* --------------------------------- HELPERS -------------------------------- */
  const customers = useMemo(
    () => dashboardData?.customers || [],
    [dashboardData?.customers]
  );

  const selectedCustomer = useMemo(
    () =>
      customers.find(
        (c: CustomerWithRelations) => c.id === selectedCustomerId
      ) ?? null,
    [customers, selectedCustomerId]
  );

  const mapLocations = useMemo(() => {
    return customers.flatMap((c: CustomerWithRelations) => {
      if (!c.locations) return [];

      return c.locations
        .filter((loc) => loc.lat != null && loc.lng != null)
        .map((loc, idx) => ({
          id: `${c.id}-${idx}`,
          lat: Number(loc.lat),
          len: Number(loc.lng),
          name: c.name,
          type: "C" as const,
        }));
    });
  }, [customers]);

  return (
    <Box sx={{ height: "calc(100vh - 100px)", p: 3, display: "flex", gap: 3 }}>
      <Stack spacing={2} sx={{ width: 400, height: "100%" }}>
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              placeholder={dict.customers.searchPlaceholder}
              size="small"
              value={filters.search || ""}
              onChange={(e) => updateFilters({ search: e.target.value })}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              data-tour="customer-add"
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={notifyDisabled}
              sx={{ whiteSpace: "nowrap", minWidth: "auto" }}
            >
              {dict.common.add}
            </Button>
          </Stack>
          {filters.search && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Chip
                label={`${dict.common.search}: ${filters.search}`}
                size="small"
                onDelete={() => updateFilters({ search: "" })}
                sx={{
                  bgcolor: "primary._alpha.main_10",
                  color: "primary.main",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: "primary._alpha.main_20",
                }}
              />
            </Stack>
          )}
        </Paper>
        <Box sx={{ flex: 1, overflow: "hidden" }} data-tour="customer-table">
          {isError ? (
            <QueryErrorState onRetry={() => refetch()} dense />
          ) : (
            <CustomerList
              customers={customers}
              selectedId={selectedCustomerId}
              loading={isLoading}
              onSelect={handleSelect}
              onEdit={notifyDisabled}
              onDelete={notifyDisabled}
              meta={{
                page: pagination.page,
                limit: pagination.pageSize,
                total: dashboardData?.totalCount || 0,
              }}
              onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
              onLimitChange={(pageSize) =>
                setPagination({ page: 1, pageSize: pageSize })
              }
            />
          )}
        </Box>
      </Stack>

      <Card
        sx={{
          flex: 1,
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
          height: "100%",
        }}
      >
        <Box sx={{ width: "100%", height: "100%" }}>
          <MapWithMarkers markers={mapLocations} zoom={7} />
        </Box>
        {mapLocations.length === 0 && (
          <Box
            position="absolute"
            top={16}
            left={16}
            bgcolor="background.paper"
            p={1}
            borderRadius={1}
            zIndex={1}
          >
            <Typography variant="caption">
              {dict.customers.noGeoData}
            </Typography>
          </Box>
        )}
      </Card>

      <CustomerDetailDialog
        key={selectedCustomerId}
        open={detailOpen}
        onClose={handleCloseDetail}
        customerId={selectedCustomerId}
        customerData={selectedCustomer}
      />
    </Box>
  );
}
