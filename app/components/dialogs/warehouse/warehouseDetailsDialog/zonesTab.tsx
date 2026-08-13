"use client";

import { useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  TextField,
  LinearProgress,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import {
  useWarehouseZones,
  useWarehouseZoneMutations,
} from "@/app/hooks/useWarehouses";
import DeleteConfirmationDialog from "@/app/components/dialogs/deleteConfirmationDialog";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

interface ZonesTabProps {
  warehouse: WarehouseWithRelations;
}

interface ZoneFormState {
  id: string | null;
  code: string;
  name: string;
  capacityPallets: string;
}

const emptyForm: ZoneFormState = { id: null, code: "", name: "", capacityPallets: "" };

const ZonesTab = ({ warehouse }: ZonesTabProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const z = dict.warehouses.dialogs.zones;
  const pathname = usePathname();
  const isDemo = pathname?.includes("/demo");

  const { data: zones, isLoading } = useWarehouseZones(warehouse.id);
  const { createZone, updateZone, deleteZone } = useWarehouseZoneMutations(warehouse.id);

  const [form, setForm] = useState<ZoneFormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; code: string } | null>(null);

  const notifyDisabled = () => toast.info(dict.toasts.demoActionDisabled);

  const openAddForm = () => (isDemo ? notifyDisabled() : setForm(emptyForm));
  const openEditForm = (zone: { id: string; code: string; name: string | null; capacityPallets: number }) =>
    isDemo
      ? notifyDisabled()
      : setForm({
          id: zone.id,
          code: zone.code,
          name: zone.name || "",
          capacityPallets: String(zone.capacityPallets || ""),
        });
  const closeForm = () => setForm(null);

  const handleSubmit = async () => {
    if (!form) return;
    const code = form.code.trim();
    if (!code) return;
    const capacityPallets = form.capacityPallets ? Number(form.capacityPallets) : 0;

    if (form.id) {
      await updateZone.mutateAsync({
        zoneId: form.id,
        data: { name: form.name.trim(), capacityPallets },
      });
    } else {
      await createZone.mutateAsync({ code, name: form.name.trim(), capacityPallets });
    }
    closeForm();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await deleteZone.mutateAsync(id);
  };

  const isSaving = createZone.isPending || updateZone.isPending;

  return (
    <Box>
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} color="text.primary">
          {z.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
          {z.subtitle}
        </Typography>
      </Stack>

      {!form && (
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={openAddForm}
          sx={{ mb: 3, textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          {z.addZone}
        </Button>
      )}

      {form && (
        <Box
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: 3,
            border: `1px solid ${theme.palette.primary._alpha.main_20}`,
            bgcolor: theme.palette.primary._alpha.main_02,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
            {form.id ? z.editZone : z.addZone}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label={z.code}
              placeholder={z.codePlaceholder}
              value={form.code}
              disabled={!!form.id}
              onChange={(e) => setForm((f) => (f ? { ...f, code: e.target.value } : f))}
              error={!form.code.trim()}
              helperText={!form.code.trim() ? z.codeRequired : " "}
              size="small"
              sx={{ flex: 1 }}
            />
            <TextField
              label={z.name}
              placeholder={z.namePlaceholder}
              value={form.name}
              onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
              size="small"
              sx={{ flex: 1 }}
            />
            <TextField
              label={z.capacityPallets}
              placeholder={z.capacityPalletsPlaceholder}
              type="number"
              value={form.capacityPallets}
              onChange={(e) =>
                setForm((f) => (f ? { ...f, capacityPallets: e.target.value } : f))
              }
              size="small"
              sx={{ flex: 1 }}
            />
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} justifyContent="flex-end">
            <Button
              onClick={closeForm}
              sx={{ textTransform: "none", color: "text.secondary" }}
            >
              {z.cancel}
            </Button>
            <Button
              variant="contained"
              disabled={!form.code.trim() || isSaving}
              onClick={handleSubmit}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
            >
              {z.save}
            </Button>
          </Stack>
        </Box>
      )}

      {!isLoading && (!zones || zones.length === 0) && (
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={1.5}
          sx={{
            py: 6,
            px: 3,
            borderRadius: 3,
            border: `1px dashed ${theme.palette.divider}`,
          }}
        >
          <WarehouseIcon sx={{ fontSize: 36, color: "text.secondary" }} />
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
            {z.empty}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: "center", maxWidth: 360 }}
          >
            {z.emptyDesc}
          </Typography>
        </Stack>
      )}

      <Stack spacing={1.5}>
        {(zones || []).map((zone) => {
          const pct = zone.capacityPallets
            ? Math.min(100, Math.round((zone.usedPallets / zone.capacityPallets) * 100))
            : 0;
          return (
            <Box
              key={zone.id}
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.background.paper,
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700}>
                    {zone.code}
                    {zone.name ? ` · ${zone.name}` : ""}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {z.usedOfCapacity
                      .replace("{used}", String(zone.usedPallets ?? 0))
                      .replace("{capacity}", String(zone.capacityPallets))}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    onClick={() => openEditForm(zone)}
                    aria-label={z.editZone}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() =>
                      isDemo
                        ? notifyDisabled()
                        : setDeleteTarget({ id: zone.id, code: zone.code })
                    }
                    aria-label={z.deleteZone}
                    sx={{ color: theme.palette.error.main }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
              {zone.capacityPallets > 0 && (
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    mt: 1.5,
                    height: 5,
                    borderRadius: 5,
                    bgcolor: theme.palette.divider,
                    "& .MuiLinearProgress-bar": {
                      bgcolor: pct >= 85 ? theme.palette.error.main : theme.palette.primary.main,
                    },
                  }}
                />
              )}
            </Box>
          );
        })}
      </Stack>

      {deleteTarget && (
        <DeleteConfirmationDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title={z.deleteZone}
          description={z.deleteZoneConfirm.replace("{code}", deleteTarget.code)}
          loading={deleteZone.isPending}
        />
      )}
    </Box>
  );
};

export default ZonesTab;
