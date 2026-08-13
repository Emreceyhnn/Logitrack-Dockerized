"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useRouteMutations } from "@/app/hooks/useRoutes";
import { getShipments } from "@/app/lib/controllers/shipments";
import { getWarehouses } from "@/app/lib/controllers/warehouse";
import { Warehouse } from "@/app/lib/type/enums";
import { useUser } from "@/app/hooks/useUser";
import { toUTC } from "@/app/lib/utils/date";
import { RouteFormValues } from "@/app/lib/type/routes";
import { ShipmentWithRelations } from "@/app/lib/type/shipment";
import { addRouteValidationSchema } from "@/app/lib/validationSchema";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";

export const initialValues: RouteFormValues = {
  name: "", startTime: null, endTime: null, startType: "WAREHOUSE", startId: "", startAddress: "",
  startLat: 0, startLng: 0, endType: "CUSTOMER", endId: "", endAddress: "", distanceKm: 0,
  durationMin: 0, driverId: "", vehicleId: "", stops: [], shape: "",
};

export const useAddRoute = (open: boolean, onClose: () => void, onSuccess?: () => void) => {
  const { user } = useUser();
  const dict = useDictionary();
  const validationSchema = useMemo(() => addRouteValidationSchema(dict), [dict]);
  const { createRoute } = useRouteMutations();

  const [currentStep, setCurrentStep] = useState(1);
  const [shipments, setShipments] = useState<ShipmentWithRelations[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      const fetchData = async () => {
        try {
          const [shipmentsData, warehousesData] = await Promise.all([
            getShipments({ unassigned: true, status: "PENDING" }),
            getWarehouses(),
          ]);
          setShipments(Array.isArray(shipmentsData) ? shipmentsData : shipmentsData.shipments);
          setWarehouses(warehousesData);
        } catch (error) { logger.error("Failed to fetch available data for route", error); }
      };
      fetchData();
    }
  }, [open, user]);

  const onSubmit = async (values: RouteFormValues) => {
    if (!user) return;
    const userTz = user.timezone || "UTC";
    const startUTC = values.startTime ? toUTC(values.startTime, userTz) : new Date();
    const endUTC = values.endTime ? toUTC(values.endTime, userTz) : new Date();
    const loadingToastId = toast.loading(dict.toasts.loading);
    try {
      await createRoute.mutateAsync([
        values.name, startUTC, startUTC, endUTC, values.distanceKm, values.durationMin,
        values.driverId, values.vehicleId, selectedShipmentId || undefined, values.stops,
        values.shape || undefined, values.bufferMeters,
      ]);
      onSuccess?.();
      onClose();
      setCurrentStep(1);
      setSelectedShipmentId(null);
    } catch (error) {
      logger.error(error);
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const closeDialog = () => {
    onClose();
    setCurrentStep(1);
    setSelectedShipmentId(null);
  };

  const steps = [dict.routes.dialogs.steps.schedule, dict.routes.dialogs.steps.locations, dict.routes.dialogs.steps.assignments];

  const handleShipmentSelectLogic = (shipmentId: string, setFieldValue: (field: string, value: unknown) => void) => {
    const shipment = shipments.find((s) => s.id === shipmentId);
    if (shipment) {
      setSelectedShipmentId(shipmentId);
      const warehouse = warehouses.find((w) => w.id === shipment.originWarehouseId || w.id === shipment.origin);
      const defaultLoc = shipment.customer?.locations?.find((l) => l.isDefault);
      const fallbackLoc = shipment.customer?.locations?.[0];

      setFieldValue("endAddress", shipment.destination || defaultLoc?.address || fallbackLoc?.address || "");
      setFieldValue("endLat", shipment.destinationLat ?? defaultLoc?.lat ?? fallbackLoc?.lat ?? undefined);
      setFieldValue("endLng", shipment.destinationLng ?? defaultLoc?.lng ?? fallbackLoc?.lng ?? undefined);

      if (warehouse) {
        setFieldValue("startAddress", warehouse.address); setFieldValue("startLat", warehouse.lat ?? undefined);
        setFieldValue("startLng", warehouse.lng ?? undefined); setFieldValue("startId", warehouse.id); setFieldValue("startType", "WAREHOUSE");
      } else {
        setFieldValue("startAddress", shipment.origin || "");
        setFieldValue("startLat", typeof shipment.originLat === "number" ? shipment.originLat : undefined);
        setFieldValue("startLng", typeof shipment.originLng === "number" ? shipment.originLng : undefined);
        setFieldValue("startId", ""); setFieldValue("startType", "WAREHOUSE");
      }

      const deadlineDate = shipment.slaDeadline ? new Date(shipment.slaDeadline) : null;
      const hasDeadline = deadlineDate && !isNaN(deadlineDate.getTime());

      setFieldValue("name", `${dict.routes.dialogs.deliveryLabel}: ${shipment.customer?.name || dict.routes.details.delivery} - ${shipment.trackingId}`);
      if (hasDeadline) { setFieldValue("endTime", new Date(deadlineDate!.getTime() + 2 * 60 * 60 * 1000)); }

      const startWaypoint = {
        address: warehouse ? warehouse.address : shipment.origin || "",
        lat: warehouse ? (warehouse.lat ?? undefined) : typeof shipment.originLat === "number" ? shipment.originLat : undefined,
        lng: warehouse ? (warehouse.lng ?? undefined) : typeof shipment.originLng === "number" ? shipment.originLng : undefined,
      };

      const endWaypoint = {
        address: shipment.destination || defaultLoc?.address || fallbackLoc?.address || "",
        lat: shipment.destinationLat ?? defaultLoc?.lat ?? fallbackLoc?.lat ?? undefined,
        lng: shipment.destinationLng ?? defaultLoc?.lng ?? fallbackLoc?.lng ?? undefined,
      };

      const stopsToSet = [];
      if (startWaypoint.address) stopsToSet.push(startWaypoint);

      if (shipment.stops && shipment.stops.length > 0) {
        const destinationLocId = shipment.customerLocationId;
        const intermediateStops = (shipment.stops || []).filter((stop, index) => {
          const isFirst = index === 0;
          const isLast = index === (shipment.stops?.length || 0) - 1;
          if (isFirst) {
            const isOrigin = (startWaypoint.address && stop.address === startWaypoint.address) || (shipment.origin && stop.address === shipment.origin) || (warehouse && stop.address === warehouse.address);
            if (isOrigin) return false;
          }
          if (isLast) {
            const isDestination = (shipment.destination && stop.address === shipment.destination) || (destinationLocId && stop.customerLocationId === destinationLocId) || (endWaypoint.address && stop.address === endWaypoint.address);
            if (isDestination) return false;
          }
          return true;
        });

        intermediateStops.forEach((stop) => { stopsToSet.push({ address: stop.address || "", lat: stop.lat ?? undefined, lng: stop.lng ?? undefined }); });
      }

      if (endWaypoint.address) stopsToSet.push(endWaypoint);
      setFieldValue("stops", stopsToSet);
      toast.info(`${dict.routes.dialogs.prefilledFrom} ${shipment.trackingId}`);
    }
  };

  return { dict, user, validationSchema, currentStep, setCurrentStep, shipments, warehouses, selectedShipmentId, onSubmit, closeDialog, steps, handleShipmentSelectLogic };
};
