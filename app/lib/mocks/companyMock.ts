import type {
  CompanyProfile,
  CompanyStats,
  CompanyMember,
} from "@/app/lib/type/company";
import type { PaginationMeta } from "@/app/lib/type/dataTable";

/**
 * Fixed mock data for the Live Demo company dashboard. Shape mirrors the return
 * type of fetchCompanyDashboard() in app/hooks/useCompany.ts —
 * { profile, stats, statsTrends, members, totalCount, meta } — as served by
 * /api/company/dashboard.
 */

const MEMBERS: Array<{
  name: string;
  surname: string;
  role: string;
  status: string;
}> = [
  { name: "Kemal", surname: "Yıldız", role: "ADMIN", status: "ACTIVE" },
  { name: "Ayşe", surname: "Demir", role: "MANAGER", status: "ACTIVE" },
  { name: "Serkan", surname: "Aksoy", role: "MANAGER", status: "ACTIVE" },
  { name: "Deniz", surname: "Kara", role: "DISPATCHER", status: "ACTIVE" },
  { name: "Mehmet", surname: "Kaya", role: "DRIVER", status: "ACTIVE" },
  { name: "Elif", surname: "Kılıç", role: "WAREHOUSE_WORKER", status: "ACTIVE" },
  { name: "Burak", surname: "Şahin", role: "DRIVER", status: "INACTIVE" },
  { name: "Selin", surname: "Erdoğan", role: "ACCOUNTANT", status: "ACTIVE" },
  { name: "Onur", surname: "Koç", role: "DISPATCHER", status: "SUSPENDED" },
  { name: "Merve", surname: "Yıldız", role: "WAREHOUSE_WORKER", status: "ACTIVE" },
];

function buildMember(index: number): CompanyMember {
  const m = MEMBERS[index % MEMBERS.length]!;
  const createdAt = new Date(
    Date.now() - (200 - index * 12) * 24 * 60 * 60 * 1000
  ).toISOString();

  return {
    id: `demo-member-${index}`,
    name: m.name,
    surname: m.surname,
    email: `${m.name.toLowerCase()}.${m.surname.toLowerCase()}@logitrack.com`,
    avatarUrl: null,
    status: m.status,
    roleId: `demo-role-${m.role}`,
    roleName: m.role,
    assignedWarehouseId: null,
    createdAt,
  };
}

export function getCompanyMembersMock(): CompanyMember[] {
  return Array.from({ length: 10 }, (_, i) => buildMember(i));
}

export function getCompanyDashboardMock(): {
  profile: CompanyProfile;
  stats: CompanyStats;
  statsTrends?: {
    users?: { value: number; isUp: boolean };
    vehicles?: { value: number; isUp: boolean };
    drivers?: { value: number; isUp: boolean };
    warehouses?: { value: number; isUp: boolean };
    customers?: { value: number; isUp: boolean };
    shipments?: { value: number; isUp: boolean };
  };
  members: CompanyMember[];
  totalCount: number;
  meta: PaginationMeta;
} {
  const members = getCompanyMembersMock();

  const profile: CompanyProfile = {
    id: "demo-company",
    name: "LogiTrack Lojistik A.Ş.",
    avatarUrl: null,
    createdAt: new Date(
      Date.now() - 720 * 24 * 60 * 60 * 1000
    ).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const stats: CompanyStats = {
    users: members.length,
    vehicles: 42,
    drivers: 28,
    warehouses: 8,
    customers: 156,
    shipments: 2418,
  };

  return {
    profile,
    stats,
    statsTrends: {
      users: { value: 3, isUp: true },
      vehicles: { value: 5, isUp: true },
      drivers: { value: 2, isUp: true },
      warehouses: { value: 1, isUp: true },
      customers: { value: 12, isUp: true },
      shipments: { value: 9, isUp: true },
    },
    members,
    totalCount: members.length,
    meta: {
      page: 1,
      limit: 10,
      total: members.length,
    },
  };
}
