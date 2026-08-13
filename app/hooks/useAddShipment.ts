"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useShipmentMutations } from "@/app/hooks/useShipments";
import { getWarehouses } from "@/app/lib/controllers/warehouse";
import { getCustomers } from "@/app/lib/controllers/customer";
import { getInventory } from "@/app/lib/controllers/inventory";
import { getTrailers } from "@/app/lib/controllers/trailer";
import { getDrivers } from "@/app/lib/controllers/driver";
import { useUser } from "@/app/hooks/useUser";
import { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import { CustomerWithRelations } from "@/app/lib/type/customer";
import { InventoryWithRelations } from "@/app/lib/type/inventory";
import { TrailerWithRelations } from "@/app/lib/type/trailer";
import { DriverWithRelations } from "@/app/lib/type/driver";
import { ShipmentFormValues } from "@/app/lib/type/shipment";
import { ShipmentStatus, ShipmentPriority } from "@/app/lib/type/enums";
import { addShipmentValidationSchema } from "@/app/lib/validationSchema";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";

export const initialValues: ShipmentFormValues = {
  trackingId: "", referenceNumber: "", priority: ShipmentPriority.MEDIUM, type: "STANDARD_FREIGHT",
  slaDeadline: null, originWarehouseId: "", originLat: undefined, originLng: undefined, destination: "",
  destinationLat: undefined, destinationLng: undefined, customerId: "", customerLocationId: "",
  contactEmail: "", billingAccount: "Standard Billing (Net 30)", weightKg: 0, volumeM3: 0,
  palletCount: 0, cargoType: "General Cargo", assignedRouteId: null, trailerId: null,
  driverId: null, inventoryItems: [], stops: [],
};

export const useAddShipment = (open: boolean, onClose: () => void, onSuccess?: () => void) => {
  const { user } = useUser();
  const dict = useDictionary();
  const validationSchema = useMemo(() => addShipmentValidationSchema(dict), [dict]);
  const { createShipment } = useShipmentMutations();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [availableInventory, setAvailableInventory] = useState<InventoryWithRelations[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseWithRelations[]>([]);
  const [customers, setCustomers] = useState<CustomerWithRelations[]>([]);
  const [trailers, setTrailers] = useState<TrailerWithRelations[]>([]);
  const [drivers, setDrivers] = useState<DriverWithRelations[]>([]);

  useEffect(() => {
    if (open && user) {
      const fetchData = async () => {
        try {
          // Pull a generous page of drivers so the picker has the roster to
          // filter/badge; the page fetches all four datasets in parallel.
          const [wRes, cRes, tRes, dRes] = await Promise.all([
            getWarehouses(), getCustomers(), getTrailers(), getDrivers(1, 100),
          ]);
          setWarehouses(wRes); setCustomers(cRes); setTrailers(tRes.trailers); setDrivers(dRes.data);
        } catch (error) { logger.error("Failed to fetch dialog data", error); }
      };
      fetchData();
    }
  }, [open, user]);

  const handleFetchInventory = useCallback(async (warehouseId: string) => {
    if (!warehouseId || !user) { setAvailableInventory([]); return; }
    setIsLoadingInventory(true);
    try {
      const inv = await getInventory(warehouseId);
      setAvailableInventory(inv);
    } catch (error) {
      logger.error("Failed to fetch warehouse inventory", error);
      setAvailableInventory([]);
    } finally { setIsLoadingInventory(false); }
  }, [user]);

  const onSubmit = async (values: ShipmentFormValues) => {
    if (!user) return;
    const selectedWarehouse = warehouses.find((w) => w.id === values.originWarehouseId);
    const originName = selectedWarehouse?.name || values.originWarehouseId;

    // Close dialog immediately for instant UI feedback (optimistic update handles cache & UI)
    onClose();
    setCurrentStep(1);
    onSuccess?.();

    try {
      await createShipment.mutateAsync({
        customerId: values.customerId, origin: originName, originWarehouseId: values.originWarehouseId,
        destination: values.destination, status: ShipmentStatus.PENDING, itemsCount: values.inventoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0) || 1,
        weightKg: values.weightKg, volumeM3: values.volumeM3, palletCount: values.palletCount,
        cargoType: values.cargoType, destinationLat: values.destinationLat, destinationLng: values.destinationLng,
        originLat: values.originLat, originLng: values.originLng, trackingId: values.trackingId,
        referenceNumber: values.referenceNumber, customerLocationId: values.customerLocationId,
        priority: values.priority, type: values.type as import("@/app/lib/type/enums").ShipmentServiceType,
        slaDeadline: values.slaDeadline, contactEmail: values.contactEmail, billingAccount: values.billingAccount,
        inventoryItems: values.inventoryItems, trailerId: values.trailerId, driverId: values.driverId, stops: values.stops,
      });
    } catch (error) {
      logger.error("Failed to create shipment:", error);
    }
  };

  const closeDialog = () => { onClose(); setCurrentStep(1); };
  const steps = [dict.shipments.dialogs.steps.logistics, dict.shipments.dialogs.steps.cargo];

  return { dict, user, validationSchema, currentStep, setCurrentStep, isLoadingInventory, availableInventory, warehouses, customers, trailers, drivers, handleFetchInventory, onSubmit, closeDialog, steps };
};
