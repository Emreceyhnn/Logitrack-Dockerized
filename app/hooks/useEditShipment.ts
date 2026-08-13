"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useShipmentMutations } from "@/app/hooks/useShipments";
import { getWarehouses } from "@/app/lib/controllers/warehouse";
import { getCustomers } from "@/app/lib/controllers/customer";
import { getInventory } from "@/app/lib/controllers/inventory";
import { getTrailers } from "@/app/lib/controllers/trailer";
import { useUser } from "@/app/hooks/useUser";
import { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import { CustomerWithRelations } from "@/app/lib/type/customer";
import { InventoryWithRelations } from "@/app/lib/type/inventory";
import { TrailerWithRelations } from "@/app/lib/type/trailer";
import { ShipmentWithRelations, ShipmentFormValues } from "@/app/lib/type/shipment";
import { ShipmentPriority } from "@/app/lib/type/enums";
import { editShipmentValidationSchema } from "@/app/lib/validationSchema";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { InventoryShipmentItem } from "@/app/lib/type/add-shipment";
import { stripUndefined } from "@/app/lib/utils/stripUndefined";
import { logger } from "@/app/lib/logger";

export const useEditShipment = (open: boolean, onClose: () => void, onSuccess?: () => void, shipment?: ShipmentWithRelations | null) => {
  const { user } = useUser();
  const dict = useDictionary();
  const validationSchema = useMemo(() => editShipmentValidationSchema(dict), [dict]);
  const { updateShipment } = useShipmentMutations();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [availableInventory, setAvailableInventory] = useState<InventoryWithRelations[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseWithRelations[]>([]);
  const [customers, setCustomers] = useState<CustomerWithRelations[]>([]);
  const [trailers, setTrailers] = useState<TrailerWithRelations[]>([]);

  useEffect(() => {
    if (open && user) {
      const fetchData = async () => {
        try {
          const [wRes, cRes, tRes] = await Promise.all([getWarehouses(), getCustomers(), getTrailers()]);
          setWarehouses(wRes);
          setCustomers(cRes);
          setTrailers(tRes.trailers);
        } catch (error) {
          logger.error("Failed to fetch dialog data", error);
        }
      };
      fetchData();
    }
  }, [open, user]);

  const handleFetchInventory = useCallback(async (warehouseId: string) => {
    if (!warehouseId || !user) {
      setAvailableInventory([]);
      return;
    }
    setIsLoadingInventory(true);
    try {
      const inv = await getInventory(warehouseId);
      setAvailableInventory(inv);
    } catch (error) {
      logger.error("Failed to fetch warehouse inventory", error);
      setAvailableInventory([]);
    } finally {
      setIsLoadingInventory(false);
    }
  }, [user]);

  const getInitialValues = (): ShipmentFormValues => {
    if (!shipment) {
      return {
        trackingId: "", referenceNumber: "", priority: ShipmentPriority.MEDIUM, type: "STANDARD_FREIGHT",
        slaDeadline: null, originWarehouseId: "", originLat: undefined, originLng: undefined,
        destination: "", destinationLat: undefined, destinationLng: undefined, customerId: "",
        customerLocationId: "", contactEmail: "", billingAccount: "Standard Billing (Net 30)",
        weightKg: 0, volumeM3: 0, palletCount: 0, cargoType: "General Cargo", assignedRouteId: null,
        trailerId: null, driverId: null, inventoryItems: [], stops: [],
      };
    }
    return {
      trackingId: shipment.trackingId || "", referenceNumber: shipment.referenceNumber || "",
      priority: (shipment.priority as ShipmentPriority) || ShipmentPriority.MEDIUM,
      type: shipment.type || "STANDARD_FREIGHT",
      slaDeadline: shipment.slaDeadline ? new Date(shipment.slaDeadline) : null,
      originWarehouseId: shipment.originWarehouseId || warehouses.find((w) => w.name === shipment.origin)?.id || "",
      originLat: shipment.originLat ?? undefined, originLng: shipment.originLng ?? undefined,
      destination: shipment.destination || "", destinationLat: shipment.destinationLat ?? undefined, destinationLng: shipment.destinationLng ?? undefined,
      customerId: shipment.customerId || "", customerLocationId: shipment.customerLocationId || "",
      contactEmail: shipment.contactEmail || "", billingAccount: shipment.billingAccount || "Standard Billing (Net 30)",
      weightKg: shipment.weightKg || 0, volumeM3: shipment.volumeM3 || 0, palletCount: shipment.palletCount || 0,
      cargoType: shipment.cargoType || "General Cargo", assignedRouteId: shipment.routeId || null, trailerId: shipment.trailerId || null,
      driverId: shipment.driverId || null,
      inventoryItems: shipment.items?.map((item) => ({
        id: item.id, sku: item.sku, name: item.name, quantity: item.quantity,
        unit: (item.unit as InventoryShipmentItem["unit"]) || "Each", weightKg: item.weightKg || 0, volumeM3: item.volumeM3 || 0,
        palletCount: item.palletCount || 1, cargoType: item.cargoType || "General Cargo",
      })) || [],
      stops: shipment.stops?.map((stop) => ({
        id: stop.id ?? "", customerId: stop.customerId || "", customerLocationId: stop.customerLocationId || "",
        address: stop.address, lat: stop.lat ?? null, lng: stop.lng ?? null, sequence: stop.sequence, contactEmail: stop.contactEmail || "",
      })) || [],
    };
  };

  const onSubmit = async (values: ShipmentFormValues) => {
    if (!user || !shipment) return;
    const selectedWarehouse = warehouses.find((w) => w.id === values.originWarehouseId);
    const originName = selectedWarehouse?.name || values.originWarehouseId;
    const sanitize = (val: string | null | undefined) => val && val.trim() !== "" ? val : null;

    try {
      await updateShipment.mutateAsync({
        id: shipment.id,
        data: stripUndefined({
          customerId: sanitize(values.customerId), customerLocationId: sanitize(values.customerLocationId),
          originWarehouseId: sanitize(values.originWarehouseId) ?? undefined, routeId: sanitize(values.assignedRouteId),
          trailerId: sanitize(values.trailerId), origin: originName, destination: values.destination,
          itemsCount: values.inventoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0) || shipment.itemsCount || 1, weightKg: values.weightKg,
          volumeM3: values.volumeM3, palletCount: values.palletCount, cargoType: values.cargoType,
          destinationLat: values.destinationLat, destinationLng: values.destinationLng, originLat: values.originLat,
          originLng: values.originLng, trackingId: values.referenceNumber, priority: values.priority,
          type: values.type as import("@/app/lib/type/enums").ShipmentServiceType, slaDeadline: values.slaDeadline,
          contactEmail: sanitize(values.contactEmail) ?? undefined, billingAccount: values.billingAccount,
          inventoryItems: values.inventoryItems, stops: values.stops,
        }),
      });
      onSuccess?.();
      onClose();
      setCurrentStep(1);
    } catch (error) {
      logger.error(error);
    }
  };

  const closeDialog = () => {
    onClose();
    setCurrentStep(1);
  };

  const steps = useMemo(() => [dict.shipments.dialogs.steps.logistics, dict.shipments.dialogs.steps.cargo], [dict]);

  return {
    dict, user, validationSchema, currentStep, setCurrentStep, isLoadingInventory, availableInventory,
    warehouses, customers, trailers, handleFetchInventory, getInitialValues, onSubmit, closeDialog, steps, shipment
  };
};
