 
import { describe, it } from "node:test";
import { expect } from "expect";
import {
  VehicleKpiConverter,
  VehicleCapacityConverter,
  VehicleDocumentConverter,
  VehicleServiceConverter,
} from "./vehicleUtils";
import { VehicleDashboardProps } from "../../type/vehicle";

describe("Vehicle Utils", () => {
  const mockVehicles: VehicleDashboardProps[] = [
    {
      id: "v-1",
      plate: "34 ABC 12",
      status: "AVAILABLE",
      maxLoadKg: 10000,
      issues: [],
      documents: [{ type: "INSURANCE", expiryDate: new Date(), id: "doc-1", name: "Ins", status: "ACTIVE", companyId: "c-1", url: "", createdAt: new Date(), updatedAt: new Date(), driverId: null, vehicleId: "v-1" }],
      maintenanceRecords: [],
      brand: "Ford",
      model: "Transit",
      year: 2020,
      fuelType: "DIESEL",
      currentLat: 0,
      currentLng: 0,
      currentVehicleId: "v-1",
      companyId: "c-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      fleetNo: "F-1",
      vin: "VIN-1",
      capacityVolumeM3: 20,
    },
    {
      id: "v-2",
      plate: "34 XYZ 99",
      status: "MAINTENANCE",
      maxLoadKg: 15000,
      issues: [{ id: "iss-1", title: "Engine", description: "Knocking", status: "OPEN", type: "VEHICLE", priority: "HIGH", createdAt: new Date(), updatedAt: new Date(), companyId: "c-1", vehicleId: "v-2", driverId: null, shipmentId: null }],
      documents: [],
      maintenanceRecords: [
        { id: "m-1", status: "SCHEDULED", type: "ENGINE_REPAIR", date: new Date(), vehicleId: "v-2", cost: 100, currency: "USD", companyId: "c-1", createdAt: new Date(), updatedAt: new Date(), description: null, documentUrl: null },
      ],
      brand: "Mercedes",
      model: "Actros",
      year: 2021,
      fuelType: "DIESEL",
      currentLat: 0,
      currentLng: 0,
      currentVehicleId: "v-2",
      companyId: "c-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      fleetNo: "F-2",
      vin: "VIN-2",
      capacityVolumeM3: 30,
    },
    {
      id: "v-3",
      plate: "06 DEF 33",
      status: "ON_TRIP",
      maxLoadKg: 12000,
      issues: [],
      documents: [],
      maintenanceRecords: [],
      brand: "Volvo",
      model: "FH",
      year: 2022,
      fuelType: "DIESEL",
      currentLat: 0,
      currentLng: 0,
      currentVehicleId: "v-3",
      companyId: "c-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      fleetNo: "F-3",
      vin: "VIN-3",
      capacityVolumeM3: 25,
    },
  ];

  describe("VehicleKpiConverter()", () => {
    it("should_ConvertVehicleDataToKpis", () => {
      const result = VehicleKpiConverter(mockVehicles);

      expect(result.totalVehicles).toBe(3);
      expect(result.available).toBe(1);
      expect(result.inService).toBe(1);
      expect(result.onTrip).toBe(1);
      expect(result.openIssues).toBe(1); // v-2 has an issue
      expect(result.docsDueSoon).toBe(1); // v-1 has a document
    });
  });

  describe("VehicleCapacityConverter()", () => {
    it("should_ExtractCapacityInformation", () => {
      const result = VehicleCapacityConverter(mockVehicles);

      expect(result.length).toBe(3);
      expect(result[0].maxLoadKg).toBe(10000);
      expect(result[1].plate).toBe("34 XYZ 99");
    });
  });

  describe("VehicleDocumentConverter()", () => {
    it("should_ExtractDocumentsFromVehicles", () => {
      const result = VehicleDocumentConverter(mockVehicles);

      expect(result.length).toBe(1);
      expect(result[0].plate).toBe("34 ABC 12");
      expect(result[0].documentType).toBe("INSURANCE");
    });
  });

  describe("VehicleServiceConverter()", () => {
    it("should_ExtractScheduledMaintenanceRecords", () => {
      const result = VehicleServiceConverter(mockVehicles);

      expect(result.length).toBe(1);
      expect(result[0].plate).toBe("34 XYZ 99");
      expect(result[0].serviceType).toBe("ENGINE_REPAIR");
    });
  });
});
