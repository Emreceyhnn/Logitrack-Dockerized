import { VehicleDashboardProps } from "../../type/vehicle";

/**
 * tr-araç verilerinden genel durum göstergelerini (KPI) (toplam, müsait, serviste, yolda vs.) hesaplar
 * en-calculates general key performance indicators (KPIs) (total, available, in service, on trip, etc.) from vehicle data
 * input (props: VehicleDashboardProps[])
 * output ({ totalVehicles: number, available: number, inService: number, onTrip: number, openIssues: number, docsDueSoon: number })
 */
export const VehicleKpiConverter = (props: VehicleDashboardProps[]) => {
  const totalVehicles = props.length;

  const available = props.filter((v) => v.status === "AVAILABLE").length;

  const inService = props.filter((v) => v.status === "MAINTENANCE").length;

  const onTrip = props.filter((v) => v.status === "ON_TRIP").length;

  const openIssues = props.filter((v) => v.issues.length > 0).length;

  const docsDueSoon = props.filter((v) => v.documents.length > 0).length;

  return {
    totalVehicles,
    available,
    inService,
    onTrip,
    openIssues,
    docsDueSoon,
  };
};

/**
 * tr-araç verilerinden sadece ID, plaka ve maksimum yük kapasitesi bilgilerini döndürür
 * en-extracts only the ID, plate, and maximum load capacity information from vehicle data
 * input (props: VehicleDashboardProps[])
 * output (Array<{ id: string, plate: string, maxLoadKg: number }>)
 */
export const VehicleCapacityConverter = (props: VehicleDashboardProps[]) => {
  return props.map((v) => ({
    id: v.id,
    plate: v.plate,
    maxLoadKg: v.maxLoadKg,
  }));
};

/**
 * tr-araçlara ait belgeleri düzleştirerek (flatten) listeler
 * en-flattens and lists documents belonging to vehicles
 * input (props: VehicleDashboardProps[])
 * output (Array<{ id: string, plate: string, documentType: string, expiryDate: Date }>)
 */
export const VehicleDocumentConverter = (props: VehicleDashboardProps[]) => {
  return props.flatMap((v) =>
    v.documents.map((d) => ({
      id: v.id,
      plate: v.plate,
      documentType: d.type,
      expiryDate: d.expiryDate,
    }))
  );
};

/**
 * tr-araçlara ait planlanmış bakım (servis) kayıtlarını düzleştirerek listeler
 * en-flattens and lists scheduled maintenance (service) records for vehicles
 * input (props: VehicleDashboardProps[])
 * output (Array<{ id: string, plate: string, serviceType: string, serviceDate: Date }>)
 */
export const VehicleServiceConverter = (props: VehicleDashboardProps[]) => {
  return props.flatMap((v) =>
    (v.maintenanceRecords || [])
      .filter((m) => m.status === "SCHEDULED")
      .map((m) => ({
        id: v.id,
        plate: v.plate,
        serviceType: m.type,
        serviceDate: m.date,
      }))
  );
};
