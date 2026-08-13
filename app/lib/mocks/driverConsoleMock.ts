import type { DriverConsoleDashboard } from "@/app/lib/type/driverConsole";

/** Fixed sample dataset for the public Live Demo driver console. */
export function getDriverConsoleDashboardMock(): DriverConsoleDashboard {
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  return {
    driver: {
      id: "demo-driver-1",
      name: "Emre Yıldız",
      initials: "EY",
      employeeId: "DRV-2291",
      phone: "+90 532 411 22 87",
      status: "ON_JOB",
      safetyScore: 92,
      efficiencyScore: 87,
      rating: 4.8,
      hazmatCertified: true,
      languages: ["Türkçe", "English"],
      licenseExpiry: iso(25 * 24 * 60 * 60 * 1000),
      homeBaseWarehouse: {
        id: "demo-warehouse-0",
        name: "İstanbul Ana Dağıtım Merkezi",
        code: "IST-DC",
        city: "İstanbul",
      },
    },
    vehicle: {
      id: "demo-vehicle-1",
      plate: "34 TL 4455",
      brand: "Mercedes-Benz",
      model: "Actros 1845",
      fleetNo: "FL-118",
      fuelLevel: 64,
      fuelCapacity: 400,
      odometerKm: 184230,
      currentLat: 40.85,
      currentLng: 29.35,
    },
    activeRoute: {
      id: "demo-route-1",
      status: "ACTIVE",
      date: iso(0),
      startTime: iso(-2 * 60 * 60 * 1000),
      distanceKm: 186.4,
      durationMin: 285,
      shape: null,
      bufferMeters: 400,
      stops: [
        { id: "s1", sequence: 1, address: "Tuzla Serbest Bölge, Depo Kapısı 3", lat: 40.82, lng: 29.3, arrivedAt: iso(-90 * 60 * 1000) },
        { id: "s2", sequence: 2, address: "Gebze OSB, C Blok No:14", lat: 40.8, lng: 29.45, arrivedAt: iso(-30 * 60 * 1000) },
        { id: "s3", sequence: 3, address: "İzmit Liman Sahası, Gate B", lat: 40.77, lng: 29.6, arrivedAt: null },
        { id: "s4", sequence: 4, address: "Sakarya Lojistik Merkezi, Rampa 6", lat: 40.75, lng: 30.05, arrivedAt: null },
        { id: "s5", sequence: 5, address: "Bolu D-100 Dinlenme Tesisi Depo", lat: 40.73, lng: 31.6, arrivedAt: null },
      ],
      deviation: { status: "on_route", distanceMeters: 45, bufferMeters: 400 },
    },
    kpis: { safetyScore: 92, efficiencyScore: 87, rating: 4.8 },
    shipments: [
      { id: "sh1", trackingId: "SHP-88213", status: "IN_TRANSIT", destination: "İzmit Liman Sahası", cargoType: "Konteyner", priority: "HIGH", slaDeadline: iso(4 * 60 * 60 * 1000), slaBreach: true, stopsTotal: 3, stopsDone: 2 },
      { id: "sh2", trackingId: "SHP-88214", status: "IN_TRANSIT", destination: "Sakarya Lojistik Merkezi", cargoType: "Palet", priority: "MEDIUM", slaDeadline: iso(8 * 60 * 60 * 1000), slaBreach: false, stopsTotal: 1, stopsDone: 0 },
      { id: "sh3", trackingId: "SHP-88190", status: "DELIVERED", destination: "Gebze OSB", cargoType: "Genel Kargo", priority: "LOW", slaDeadline: iso(-24 * 60 * 60 * 1000), slaBreach: false, stopsTotal: 1, stopsDone: 1 },
      { id: "sh4", trackingId: "SHP-88201", status: "PENDING", destination: "Bolu Lojistik Depo", cargoType: "Soğuk Zincir", priority: "HIGH", slaDeadline: iso(36 * 60 * 60 * 1000), slaBreach: false, stopsTotal: 1, stopsDone: 0 },
    ],
    fuelLogs: [
      { id: "f1", date: iso(-2 * 24 * 60 * 60 * 1000), volumeLiter: 210, cost: 9870, currency: "USD" },
      { id: "f2", date: iso(-6 * 24 * 60 * 60 * 1000), volumeLiter: 195, cost: 9150, currency: "USD" },
    ],
    issues: [
      { id: "i1", title: "Sağ arka lastik aşınması", priority: "MEDIUM", status: "IN_PROGRESS", createdAt: iso(-3 * 24 * 60 * 60 * 1000) },
    ],
    documents: [
      { id: "d1", type: "LICENSE", name: "Sürücü Belgesi (C+E)", expiryDate: iso(25 * 24 * 60 * 60 * 1000), status: "EXPIRING_SOON" },
      { id: "d2", type: "OTHER", name: "ADR / Hazmat Sertifikası", expiryDate: iso(220 * 24 * 60 * 60 * 1000), status: "ACTIVE" },
      { id: "d3", type: "OTHER", name: "Psikoteknik Belgesi", expiryDate: iso(120 * 24 * 60 * 60 * 1000), status: "ACTIVE" },
      { id: "d4", type: "OTHER", name: "Sağlık Raporu", expiryDate: iso(45 * 24 * 60 * 60 * 1000), status: "ACTIVE" },
    ],
  };
}
