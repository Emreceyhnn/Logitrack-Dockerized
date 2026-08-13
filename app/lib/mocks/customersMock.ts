import type { CustomerWithRelations } from "@/app/lib/type/customer";

/**
 * Fixed mock data for the Live Demo customers dashboard. Shape mirrors the
 * return type of fetchCustomerDashboard() in app/hooks/useCustomers.ts —
 * { customers, totalCount, stats, statsTrends } — as served by
 * /api/customers/dashboard.
 */

const CUSTOMERS: Array<{
  name: string;
  industry: string;
  city: string;
  lat: number;
  lng: number;
}> = [
  { name: "Anadolu Lojistik A.Ş.", industry: "Logistics", city: "İstanbul", lat: 41.0082, lng: 28.9784 },
  { name: "Marmara Tekstil San.", industry: "Textile", city: "Bursa", lat: 40.1826, lng: 29.0665 },
  { name: "Ege Elektronik Ltd.", industry: "Electronics", city: "İzmir", lat: 38.4237, lng: 27.1428 },
  { name: "Boğaziçi Gıda San.", industry: "Food & Beverage", city: "İstanbul", lat: 41.0422, lng: 29.0093 },
  { name: "Karadeniz Otomotiv", industry: "Automotive", city: "Trabzon", lat: 41.0015, lng: 39.7178 },
  { name: "Akdeniz İnşaat A.Ş.", industry: "Construction", city: "Antalya", lat: 36.8969, lng: 30.7133 },
  { name: "Trakya Kimya San.", industry: "Chemicals", city: "Edirne", lat: 41.6771, lng: 26.5557 },
  { name: "Orta Anadolu Makine", industry: "Machinery", city: "Ankara", lat: 39.9334, lng: 32.8597 },
  { name: "Çukurova Tarım Ürünleri", industry: "Agriculture", city: "Adana", lat: 37.0, lng: 35.3213 },
  { name: "Güneydoğu Mobilya", industry: "Furniture", city: "Gaziantep", lat: 37.0662, lng: 37.3833 },
  { name: "İç Anadolu Un San.", industry: "Food & Beverage", city: "Konya", lat: 37.8746, lng: 32.4932 },
  { name: "Doğu Madencilik A.Ş.", industry: "Mining", city: "Erzurum", lat: 39.9043, lng: 41.2679 },
];

function buildCustomer(index: number): CustomerWithRelations {
  const c = CUSTOMERS[index % CUSTOMERS.length]!;
  const createdAt = new Date(Date.now() - (90 - index * 5) * 24 * 60 * 60 * 1000);
  const slug = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");

  return {
    id: `demo-customer-${index}`,
    code: `CUST-${1000 + index}`,
    name: c.name,
    industry: c.industry,
    taxId: `${1000000000 + index * 137}`,
    email: `info@${slug}.com.tr`,
    phone: `+90 2${(12 + (index % 80)).toString().padStart(2, "0")} 555 ${(1000 + index)
      .toString()
      .slice(0, 4)}`,
    companyId: "demo-company",
    createdAt,
    updatedAt: createdAt,
    _count: {
      shipments: 4 + (index % 20),
    },
    locations: [
      {
        id: `demo-loc-${index}-0`,
        customerId: `demo-customer-${index}`,
        name: `${c.city} Merkez`,
        address: `${c.city} Ticaret Merkezi No:${20 + index}`,
        lat: c.lat,
        lng: c.lng,
        isDefault: true,
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };
}

export function getCustomersMock(): CustomerWithRelations[] {
  return Array.from({ length: 12 }, (_, i) => buildCustomer(i));
}

export function getCustomersDashboardMock(): {
  customers: CustomerWithRelations[];
  totalCount: number;
  stats: {
    totalCustomers: number;
    activeCustomers: number;
    totalShipments: number;
  };
  statsTrends?: {
    totalCustomers?: { value: number; isUp: boolean };
  };
} {
  const customers = getCustomersMock();

  return {
    customers,
    totalCount: customers.length,
    stats: {
      totalCustomers: customers.length,
      activeCustomers: customers.filter((c) => (c._count?.shipments ?? 0) > 0)
        .length,
      totalShipments: customers.reduce(
        (s, c) => s + (c._count?.shipments ?? 0),
        0
      ),
    },
    statsTrends: {
      totalCustomers: { value: 5, isUp: true },
    },
  };
}
