import { db as firebase, ref, onValue, off } from "./firebase";
import { ensureFirebaseAuth } from "./firebase-auth";
import { VehicleLocation } from "@/app/lib/type/vehicle";

/**
 * tr- Belirli bir araç için gerçek zamanlı konum güncellemelerini dinler
 * en- Listens for real-time location updates for a specific vehicle
 * input (
  companyId: string,
  vehicleId: string,
  callback: (location: VehicleLocation | null) => void,
  onError?: (error: Error) => void
)
 * output ( () => void)
 */

export const subscribeToVehicleLocation = (
  companyId: string,
  vehicleId: string,
  callback: (location: VehicleLocation | null) => void,
  onError?: (error: Error) => void
) => {
  const path = `vehicles/locations/${companyId}/${vehicleId}`;
  let vehicleRef: ReturnType<typeof ref> | null = null;
  let cancelled = false;

  void ensureFirebaseAuth()
    .then(() => {
      if (cancelled) return;
      vehicleRef = ref(firebase, path);

      onValue(
        vehicleRef,
        (snapshot) => callback(snapshot.val()),
        (error) => onError?.(error)
      );
    })
    .catch((error) => {
      if (!cancelled) onError?.(error as Error);
    });

  return () => {
    cancelled = true;
    if (vehicleRef) off(vehicleRef);
  };
};

/**
 * tr-Belirli bir şirket için tüm araç konumlarını dinler
 * en-Listens to all vehicle locations for a specific company
 * input (
  companyId: string,
  callback: (locations: Record<string, VehicleLocation>) => void,
  onError?: (error: Error) => void
)
 * output ( () => void)
 */

export const subscribeToAllVehicles = (
  companyId: string,
  callback: (locations: Record<string, VehicleLocation>) => void,
  onError?: (error: Error) => void
) => {
  const path = `vehicles/locations/${companyId}`;
  let vehiclesRef: ReturnType<typeof ref> | null = null;
  let cancelled = false;

  void ensureFirebaseAuth()
    .then(() => {
      if (cancelled) return;
      vehiclesRef = ref(firebase, path);
      onValue(
        vehiclesRef,
        (snapshot) => callback(snapshot.val() || {}),
        (error) => onError?.(error)
      );
    })
    .catch((error) => {
      if (!cancelled) onError?.(error as Error);
    });

  return () => {
    cancelled = true;
    if (vehiclesRef) off(vehiclesRef);
  };
};
