"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { useVehicleMutations } from "@/app/hooks/useVehicles";
import { uploadImageAction } from "@/app/lib/actions/upload";
import { VehicleWithRelations, VehicleFormValues } from "@/app/lib/type/vehicle";
import { VehicleType } from "@/app/lib/type/enums";
import { editVehicleValidationSchema } from "@/app/lib/validationSchema";
import { useFormikContext } from "formik";
import { Dictionary } from "@/app/lib/language/language";

export const useEditVehicle = (vehicle: VehicleWithRelations, open: boolean, onClose: () => void, onSuccess?: () => void, dict?: Dictionary) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef<string | null>(null);
  const { updateVehicle } = useVehicleMutations();

  const [initialValues, setInitialValues] = useState<VehicleFormValues>({
    fleetNo: "", plate: "", type: "", brand: "", model: "", year: "", odometerKm: "", nextServiceKm: "",
    maxLoadKg: "", fuelType: "", fuelLevel: 50, status: "", avgFuelConsumption: "", engineSize: "",
    transmission: "", techNotes: "", fuelCapacity: "", registrationExpiry: null, inspectionExpiry: null,
    nextServiceDueKm: "", enableExpiryAlerts: true, documents: [],
  });

  const validationSchema = useMemo(() => dict ? editVehicleValidationSchema(dict) : null, [dict]);

  useEffect(() => {
    if (open && vehicle && isInitialized.current !== vehicle.id) {
      isInitialized.current = vehicle.id;
      setInitialValues({
        fleetNo: vehicle.fleetNo || "", plate: vehicle.plate || "", type: vehicle.type || "", brand: vehicle.brand || "",
        model: vehicle.model || "", year: vehicle.year || "", odometerKm: vehicle.odometerKm || "", nextServiceKm: vehicle.nextServiceKm || "",
        photo: vehicle.photo || "", maxLoadKg: vehicle.maxLoadKg || "", fuelType: vehicle.fuelType || "", fuelLevel: vehicle.fuelLevel || 50,
        status: vehicle.status || "AVAILABLE", avgFuelConsumption: vehicle.avgFuelConsumption || "", engineSize: vehicle.engineSize || "",
        transmission: vehicle.transmission || "", techNotes: vehicle.techNotes || "", fuelCapacity: vehicle.fuelCapacity || "",
        registrationExpiry: null, inspectionExpiry: null, nextServiceDueKm: "", enableExpiryAlerts: true, documents: [],
      });
      setCurrentStep(1); setError(null);
    } else if (!open) {
      isInitialized.current = null;
    }
  }, [open, vehicle]);

  const closeDialog = () => { onClose(); setTimeout(() => setCurrentStep(1), 300); };

  const handleSubmit = async (values: VehicleFormValues) => {
    closeDialog();
    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string); reader.onerror = (err) => reject(err);
    });

    let photoUrl = values.photo;
    if (values.photo instanceof File) {
      const base64 = await fileToBase64(values.photo);
      const uploadResult = await uploadImageAction(base64, "vehicles");
      photoUrl = uploadResult.url;
    }

    const updateData = {
      fleetNo: values.fleetNo || undefined, plate: values.plate, type: values.type as VehicleType,
      brand: values.brand, model: values.model, year: Number(values.year), odometerKm: values.odometerKm ? Number(values.odometerKm) : null,
      maxLoadKg: values.maxLoadKg ? Number(values.maxLoadKg) : 0, fuelType: values.fuelType, avgFuelConsumption: values.avgFuelConsumption ? Number(values.avgFuelConsumption) : null,
      fuelLevel: values.fuelLevel ? Number(values.fuelLevel) : null, fuelCapacity: values.fuelCapacity ? Number(values.fuelCapacity) : null,
      nextServiceKm: values.nextServiceKm ? Number(values.nextServiceKm) : null, status: values.status, engineSize: values.engineSize,
      transmission: values.transmission, techNotes: values.techNotes, photo: (photoUrl as string) || null,
    };

    try {
      await updateVehicle.mutateAsync({
        id: vehicle.id,
        data: updateData as Parameters<typeof updateVehicle.mutateAsync>[0]["data"],
      });
      onSuccess?.();
    } catch {
      // useVehicleMutations() already toasts the error
    }
  };

  return { initialValues, validationSchema, currentStep, setCurrentStep, error, setError, closeDialog, handleSubmit };
};

export const StepSync = ({ currentStep, setCurrentStep, dict }: { currentStep: number; setCurrentStep: React.Dispatch<React.SetStateAction<number>>; dict: Dictionary; }) => {
  const { errors, submitCount } = useFormikContext<VehicleFormValues>();
  useEffect(() => {
    if (submitCount > 0 && Object.keys(errors).length > 0) {
      const getStepForField = (fieldName: string): number => {
        const step1Fields = ["plate", "fleetNo", "brand", "model", "type", "year", "odometerKm", "photo", "status"];
        if (step1Fields.includes(fieldName)) return 1; return 2;
      };
      const firstErrorField = Object.keys(errors)[0] ?? "";
      const targetStep = getStepForField(firstErrorField);
      if (targetStep !== currentStep) {
        setCurrentStep(targetStep);
        toast.error(dict.validation.genericFormError || "Please check errors in the highlighted step.");
      }
    }
  }, [submitCount, errors, currentStep, setCurrentStep, dict]);
  return null;
};
