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
import CustomerDetailDialog from "@/app/components/dialogs/customer/customerDetailDialog";
import EditCustomerDialog from "@/app/components/dialogs/customer/editCustomerDialog";
import AddCustomerDialog from "@/app/components/dialogs/customer/addCustomerDialog";
import DeleteConfirmationDialog from "@/app/components/dialogs/deleteConfirmationDialog";
import CustomerList from "@/app/components/dashboard/customer/CustomerList";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  CustomerPageActions,
  CustomerWithRelations,
} from "@/app/lib/type/customer";
import {
  useCustomersWithDashboard,
  useCustomerMutations,
} from "@/app/hooks/useCustomers";
import { useUser } from "@/app/hooks/useUser";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { toast } from "sonner";
import dynamic from "next/dynamic";
const MapWithMarkers = dynamic(
  () => import("@/app/components/valhalla/mapWithMarker"),
  {
    ssr: false,
  }
);

export default function CustomerContent() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const { user } = useUser();
  const dict = useDictionary();

  /* ---------------------------------- STATE --------------------------------- */
  const [filters, setFilters] = useState<{ search: string }>({ search: "" });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionCustomer, setActionCustomer] =
    useState<CustomerWithRelations | null>(null);

  /* ---------------------------------- HOOKS --------------------------------- */
  const {
    data: dashboardData,
    isLoading,
    isError,
    refetch,
  } = useCustomersWithDashboard(
    pagination.page,
    pagination.pageSize,
    filters.search
  );

  const { deleteCustomer: deleteMutation } = useCustomerMutations();

  // Auto-open details dialog when navigating from overview map with ?id=
  const searchParams = useSearchParams();
  const customerIdFromUrl = searchParams.get("id");

  useEffect(() => {
    if (customerIdFromUrl && !isLoading) {
      if (!customerIdFromUrl.startsWith("temp-")) {
        setSelectedCustomerId(customerIdFromUrl);
        setDetailOpen(true);
      }
    }
  }, [customerIdFromUrl, isLoading]);

  /* -------------------------------- HANDLERS -------------------------------- */
  const handleEdit = (customer: CustomerWithRelations) => {
    setActionCustomer(customer);
    setEditOpen(true);
  };

  const handleDelete = (customer: CustomerWithRelations) => {
    setActionCustomer(customer);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!actionCustomer || !user) return;
    try {
      await deleteMutation.mutateAsync(actionCustomer.id);
      toast.success(
        dict.customers.dialogs.successDelete || "Customer deleted successfully"
      );
      setDeleteOpen(false);
      setDetailOpen(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : dict.customers.dialogs.errorDelete || "Failed to delete customer";
      toast.error(message);
    }
  };

  /* --------------------------------- ACTIONS -------------------------------- */
  const actions: CustomerPageActions = useMemo(
    () => ({
      fetchCustomers: async () => {},
      selectCustomer: (id: string) => {
        if (!id || id.startsWith("temp-")) return;
        setSelectedCustomerId(id);
        setDetailOpen(true);
      },
      updateFilters: (newFilters: Partial<{ search: string }>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPagination((prev) => ({ ...prev, page: 1 }));
      },
    }),
    []
  );

  /* --------------------------------- HELPERS -------------------------------- */
  const customers = useMemo(
    () => dashboardData?.customers || [],
    [dashboardData?.customers]
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
              onChange={(e) =>
                actions.updateFilters({ search: e.target.value })
              }
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
              onClick={() => setAddOpen(true)}
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
                onDelete={() => actions.updateFilters({ search: "" })}
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
            onSelect={actions.selectCustomer}
            onEdit={handleEdit}
            onDelete={handleDelete}
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
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        customerId={selectedCustomerId}
      />

      <EditCustomerDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {}}
        customer={actionCustomer}
      />

      <AddCustomerDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {}}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={dict.customers.deleteTitle}
        description={dict.customers.deleteDesc.replace(
          "{name}",
          actionCustomer?.name || dict.common.this || "this"
        )}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
