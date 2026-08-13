import type { ApiEndpointPreset } from "@/app/lib/type/admin/sandbox";

/**
 * API TESTER PRESETS
 * ==================
 * The endpoints offered in the sandbox picker, mirroring the real routes under
 * `app/api/`. Admin console routes are intentionally excluded — replaying them
 * through the tester would recurse and pollute the audit trail, and the server
 * rejects them anyway (see `assertSafeApiPath`).
 *
 * Read-only GET routes come first because they are safe to fire repeatedly;
 * mutating routes carry a sample body so the shape is obvious before sending.
 */
export const API_ENDPOINT_PRESETS: ApiEndpointPreset[] = [
  // ── Dashboards (read-only) ───────────────────────────────────────────────
  {
    id: "overview-dashboard",
    label: "Overview dashboard",
    method: "GET",
    path: "/api/overview/dashboard",
    group: "Dashboards",
  },
  {
    id: "analytics-dashboard",
    label: "Analytics dashboard",
    method: "GET",
    path: "/api/analytics/dashboard",
    group: "Dashboards",
  },
  {
    id: "reports-dashboard",
    label: "Reports dashboard",
    method: "GET",
    path: "/api/reports/dashboard",
    group: "Dashboards",
  },
  {
    id: "company-dashboard",
    label: "Company dashboard",
    method: "GET",
    path: "/api/company/dashboard",
    group: "Dashboards",
  },

  // ── Fleet ────────────────────────────────────────────────────────────────
  {
    id: "vehicles-list",
    label: "List vehicles",
    method: "GET",
    path: "/api/vehicles",
    group: "Fleet",
  },
  {
    id: "vehicles-dashboard",
    label: "Vehicles dashboard",
    method: "GET",
    path: "/api/vehicles/dashboard",
    group: "Fleet",
  },
  {
    id: "drivers-list",
    label: "List drivers",
    method: "GET",
    path: "/api/drivers",
    group: "Fleet",
  },
  {
    id: "trailers-list",
    label: "List trailers",
    method: "GET",
    path: "/api/trailers",
    group: "Fleet",
  },

  // ── Operations ───────────────────────────────────────────────────────────
  {
    id: "shipments-list",
    label: "List shipments",
    method: "GET",
    path: "/api/shipments",
    group: "Operations",
  },
  {
    id: "routes-list",
    label: "List routes",
    method: "GET",
    path: "/api/routes",
    group: "Operations",
  },
  {
    id: "customers-list",
    label: "List customers",
    method: "GET",
    path: "/api/customers",
    group: "Operations",
  },
  {
    id: "warehouses-list",
    label: "List warehouses",
    method: "GET",
    path: "/api/warehouses",
    group: "Operations",
  },
  {
    id: "inventory-dashboard",
    label: "Inventory dashboard",
    method: "GET",
    path: "/api/inventory/dashboard",
    group: "Operations",
  },

  // ── Integrations ─────────────────────────────────────────────────────────
  {
    id: "exchange-rates",
    label: "Exchange rates",
    method: "GET",
    path: "/api/exchange-rates",
    group: "Integrations",
  },
  {
    id: "valhalla-route",
    label: "Valhalla routing",
    method: "POST",
    path: "/api/valhalla",
    group: "Integrations",
    sampleBody: JSON.stringify(
      {
        locations: [
          { lat: 41.0082, lon: 28.9784 },
          { lat: 39.9334, lon: 32.8597 },
        ],
        costing: "auto",
      },
      null,
      2
    ),
  },

  // ── Demo surface (safe, no tenant data) ──────────────────────────────────
  {
    id: "demo-overview",
    label: "Demo overview",
    method: "GET",
    path: "/api/demo/overview/dashboard",
    group: "Demo",
  },
  {
    id: "demo-shipments",
    label: "Demo shipments",
    method: "GET",
    path: "/api/demo/shipments/dashboard",
    group: "Demo",
  },
];

/**
 * tr-Presetleri gruba göre sıralar.
 * en-Groups presets by their `group` label, preserving insertion order.
 * input ()
 * output (Map<string, ApiEndpointPreset[]>)
 */
export function groupEndpointPresets(): Map<string, ApiEndpointPreset[]> {
  const map = new Map<string, ApiEndpointPreset[]>();
  for (const preset of API_ENDPOINT_PRESETS) {
    const bucket = map.get(preset.group) ?? [];
    bucket.push(preset);
    map.set(preset.group, bucket);
  }
  return map;
}
