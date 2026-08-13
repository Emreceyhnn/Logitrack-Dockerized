import { useState, useCallback, useEffect } from "react";
import { getAvailableDrivers } from "@/app/lib/controllers/vehicle";
import { useVehicleMutations } from "@/app/hooks/useVehicles";
import { DriverWithUser } from "@/app/lib/type/vehicle";
import { logger } from "@/app/lib/logger";
import { Dictionary } from "@/app/lib/language/language";

export const useAssignDriver = (vehicleId: string, open: boolean, onClose: () => void, onSuccess: () => void, dict: Dictionary) => {
  const [drivers, setDrivers] = useState<DriverWithUser[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { assignDriver, unassignDriver } = useVehicleMutations();

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAvailableDrivers();
      setDrivers(data);
    } catch (err) {
      logger.error(err);
      setError(dict.vehicles.dialogs.failedToLoadDrivers);
    } finally {
      setLoading(false);
    }
  }, [dict.vehicles.dialogs.failedToLoadDrivers]);

  useEffect(() => {
    if (open) {
      fetchDrivers();
      setSelectedDriverId("");
      setError(null);
    }
  }, [open, fetchDrivers]);

  const handleAssign = async () => {
    if (!selectedDriverId) return;
    const driver = drivers.find((d) => d.id === selectedDriverId);
    if (!driver) return;
    try {
      await assignDriver.mutateAsync({ vehicleId, driver });
      onSuccess();
      onClose();
    } catch (err) {
      logger.error(err);
      setError(dict.vehicles.dialogs.failedToAssign);
    }
  };

  const handleUnassign = async () => {
    try {
      await unassignDriver.mutateAsync(vehicleId);
      onSuccess();
      onClose();
    } catch (err) {
      logger.error(err);
      setError(dict.vehicles.dialogs.failedToUnassign);
    }
  };

  const actionLoading = assignDriver.isPending || unassignDriver.isPending;

  return { drivers, selectedDriverId, setSelectedDriverId, loading, actionLoading, error, handleAssign, handleUnassign };
};
