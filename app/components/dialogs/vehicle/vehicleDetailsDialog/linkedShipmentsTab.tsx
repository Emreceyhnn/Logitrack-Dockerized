"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Box,
  Stack,
  Typography,
  Button,
  Checkbox,
  Chip,
  MenuItem,
  TextField,
  CircularProgress,
  useTheme,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { VehicleWithRelations } from "@/app/lib/type/vehicle";
import { ShipmentStatus } from "@/app/lib/type/enums";
import {
  getVehicleLinkedShipments,
  getEligibleTargetTrailers,
  bulkReassignTrailer,
  type TrailerLinkedShipment,
  type EligibleTargetTrailer,
} from "@/app/lib/controllers/shipments";
import { logger } from "@/app/lib/logger";

interface LinkedShipmentsTabProps {
  vehicle?: VehicleWithRelations | undefined;
  onUpdate?: (() => void) | undefined;
}

export default function LinkedShipmentsTab({
  vehicle,
  onUpdate,
}: LinkedShipmentsTabProps) {
  const dict = useDictionary();
  const theme = useTheme();
  const t = dict.vehicles?.dialogs?.linkedShipments;
  const pathname = usePathname();
  const isDemo = pathname?.includes("/demo");

  const [loading, setLoading] = useState(true);
  const [sourceTrailerId, setSourceTrailerId] = useState<string | null>(null);
  const [shipments, setShipments] = useState<TrailerLinkedShipment[]>([]);
  const [targets, setTargets] = useState<EligibleTargetTrailer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetId, setTargetId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!vehicle?.id) return;
    setLoading(true);
    if (isDemo) {
      setSourceTrailerId("demo-trailer-1");
      setShipments([
        {
          id: "shp-demo-1",
          trackingId: "TRK-DEMO101",
          destination: "Ankara",
          status: ShipmentStatus.IN_TRANSIT,
          weightKg: 1500,
          volumeM3: 4.5,
          priority: "NORMAL",
        },
        {
          id: "shp-demo-2",
          trackingId: "TRK-DEMO102",
          destination: "İzmir",
          status: ShipmentStatus.PENDING,
          weightKg: 2000,
          volumeM3: 6.0,
          priority: "HIGH",
        }
      ]);
      setSelected(new Set(["shp-demo-1", "shp-demo-2"]));
      setTargets([
        {
          id: "trailer-demo-2",
          plate: "34 DEF 456",
          type: "DRY_VAN",
          maxLoadKg: 24000,
          capacityVolumeM3: 80,
          usedWeightKg: 0,
          usedVolumeM3: 0,
          vehiclePlate: null,
        }
      ]);
      setLoading(false);
      return;
    }
    try {
      const linked = await getVehicleLinkedShipments(vehicle.id);
      setSourceTrailerId(linked.trailerId);
      setShipments(linked.shipments);
      // Every active shipment is pre-selected — the common case is "move them
      // all off the broken vehicle"; the dispatcher can deselect exceptions.
      setSelected(new Set(linked.shipments.map((s) => s.id)));
      const eligible = await getEligibleTargetTrailers(
        linked.trailerId ?? undefined
      );
      setTargets(eligible);
    } catch (error) {
      logger.error("Failed to load linked shipments", error);
    } finally {
      setLoading(false);
    }
  }, [vehicle, isDemo]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected =
    shipments.length > 0 && selected.size === shipments.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(shipments.map((s) => s.id)));
  };

  const handleReassign = async () => {
    if (!targetId || selected.size === 0) return;
    setSubmitting(true);
    try {
      const res = await bulkReassignTrailer([...selected], targetId);
      toast.success(
        (t?.reassigned || "{count} shipments reassigned").replace(
          "{count}",
          String(res.reassigned)
        )
      );
      onUpdate?.();
      await load();
      setTargetId("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t?.reassignError || "Could not reassign"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
        <CircularProgress size={32} />
      </Stack>
    );
  }

  if (shipments.length === 0) {
    return (
      <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
        <LocalShippingIcon sx={{ fontSize: 40, color: "text.secondary", opacity: 0.5 }} />
        <Typography variant="body2" color="text.secondary">
          {sourceTrailerId
            ? t?.noneActive || "No active shipments on this vehicle."
            : t?.noTrailer || "This vehicle has no trailer attached."}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {(t?.subtitle || "{count} active shipments on this vehicle's trailer").replace(
          "{count}",
          String(shipments.length)
        )}
      </Typography>

      {/* Select-all header */}
      <Stack
        direction="row"
        alignItems="center"
        sx={{ px: 1, py: 0.5, borderBottom: `1px solid ${theme.palette.divider}` }}
      >
        <Checkbox
          size="small"
          checked={allSelected}
          indeterminate={selected.size > 0 && !allSelected}
          onChange={toggleAll}
        />
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          {(t?.selectedCount || "{n} selected").replace("{n}", String(selected.size))}
        </Typography>
      </Stack>

      <Stack spacing={1} sx={{ maxHeight: 280, overflowY: "auto", pr: 0.5 }}>
        {shipments.map((s) => (
          <Stack
            key={s.id}
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.02)",
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Checkbox
              size="small"
              checked={selected.has(s.id)}
              onChange={() => toggle(s.id)}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {s.trackingId}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {s.destination} · {Math.round(s.weightKg)} kg
              </Typography>
            </Box>
            <Chip
              size="small"
              label={dict.shipments?.statuses?.[s.status] || s.status}
              sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
            />
          </Stack>
        ))}
      </Stack>

      {/* Target trailer + bulk action */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="flex-start"
        sx={{ pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}
      >
        <TextField
          select
          fullWidth
          size="small"
          label={t?.targetTrailer || "Move to trailer"}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          helperText={
            targets.length === 0 ? t?.noTargets || "No available trailers" : undefined
          }
          disabled={targets.length === 0}
        >
          {targets.map((tr) => {
            const freeW = Math.max(0, Math.round(tr.maxLoadKg - tr.usedWeightKg));
            return (
              <MenuItem key={tr.id} value={tr.id}>
                {tr.plate} ({tr.type}) · {freeW} kg{" "}
                {dict.shipments?.dialogs?.fields?.capacityFree || "free"}
                {tr.vehiclePlate ? ` · ${tr.vehiclePlate}` : ""}
              </MenuItem>
            );
          })}
        </TextField>
        <Button
          variant="contained"
          startIcon={<SwapHorizIcon />}
          disabled={!targetId || selected.size === 0 || submitting}
          onClick={handleReassign}
          sx={{ textTransform: "none", fontWeight: 700, whiteSpace: "nowrap", minWidth: 160 }}
        >
          {submitting
            ? dict.common?.loading || "..."
            : (t?.reassignButton || "Reassign {n}").replace(
                "{n}",
                String(selected.size)
              )}
        </Button>
      </Stack>
    </Stack>
  );
}
