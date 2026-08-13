import { describe, it, before } from "node:test";
import { expect } from "expect";
import type { Dictionary } from "@/app/lib/language/language";
import enDict from "@/app/lib/language/dictionaries/en.json";

/**
 * The nav tree drives the sidebar, the command palette and the breadcrumbs at
 * once, so a broken entry breaks all three. These tests pin the invariants
 * that matter: every navigable entry points somewhere real, group headers are
 * not themselves links, and locale stripping is exact.
 */
describe("lib/admin/nav.ts", () => {
  let buildAdminNav: (d: Dictionary) => unknown[];
  let flattenAdminNav: (n: unknown[]) => { id: string; href: string }[];
  let buildAdminBreadcrumbs: (
    p: string,
    n: unknown[],
    d: Dictionary
  ) => { label: string; href?: string }[];
  let stripLocale: (p: string) => string;

  const dict = enDict as unknown as Dictionary;

  before(async () => {
    const mod = await import("./nav");
    buildAdminNav = mod.buildAdminNav as typeof buildAdminNav;
    flattenAdminNav = mod.flattenAdminNav as typeof flattenAdminNav;
    buildAdminBreadcrumbs =
      mod.buildAdminBreadcrumbs as typeof buildAdminBreadcrumbs;
    stripLocale = mod.stripLocale;
  });

  describe("stripLocale", () => {
    it("removes a two-letter locale prefix", () => {
      expect(stripLocale("/en/admin/tenants")).toBe("/admin/tenants");
      expect(stripLocale("/tr/admin")).toBe("/admin");
    });

    it("leaves an unprefixed path alone", () => {
      expect(stripLocale("/admin/tenants")).toBe("/admin/tenants");
    });

    it("handles the bare admin root", () => {
      expect(stripLocale("/en/admin")).toBe("/admin");
    });
  });

  describe("buildAdminNav", () => {
    it("builds a non-empty tree", () => {
      expect(buildAdminNav(dict).length).toBeGreaterThan(0);
    });

    it("gives every navigable entry an /admin path", () => {
      for (const item of flattenAdminNav(buildAdminNav(dict))) {
        expect(item.href.startsWith("/admin")).toBe(true);
      }
    });

    it("assigns unique ids across the whole tree", () => {
      const ids = flattenAdminNav(buildAdminNav(dict)).map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    // Group headers carry an empty href; flatten must drop them so the command
    // palette never offers a link that goes nowhere.
    it("excludes group headers from the flattened list", () => {
      for (const item of flattenAdminNav(buildAdminNav(dict))) {
        expect(item.href).not.toBe("");
      }
    });

    it("localizes labels from the dictionary", () => {
      const nav = buildAdminNav(dict) as { label: string }[];
      expect(nav[0]?.label).toBe(dict.admin.nav.overview);
    });
  });

  describe("buildAdminBreadcrumbs", () => {
    it("returns just the root for the console home", () => {
      const crumbs = buildAdminBreadcrumbs("/en/admin", buildAdminNav(dict), dict);
      expect(crumbs.length).toBe(1);
      expect(crumbs[0]?.label).toBe(dict.admin.title);
    });

    it("returns root → group → page for a nested route", () => {
      const crumbs = buildAdminBreadcrumbs(
        "/en/admin/tenants",
        buildAdminNav(dict),
        dict
      );
      expect(crumbs.length).toBe(3);
      expect(crumbs[2]?.label).toBe(dict.admin.nav.tenants);
    });

    // The group header is not a page, so it must not be a link.
    it("leaves the group crumb without an href", () => {
      const crumbs = buildAdminBreadcrumbs(
        "/en/admin/tenants",
        buildAdminNav(dict),
        dict
      );
      expect(crumbs[1]?.href).toBeUndefined();
    });

    it("falls back to the root for an unknown path", () => {
      const crumbs = buildAdminBreadcrumbs(
        "/en/admin/does-not-exist",
        buildAdminNav(dict),
        dict
      );
      expect(crumbs.length).toBe(1);
    });

    it("works without a locale prefix", () => {
      const crumbs = buildAdminBreadcrumbs(
        "/admin/sessions",
        buildAdminNav(dict),
        dict
      );
      expect(crumbs[2]?.label).toBe(dict.admin.nav.sessions);
    });
  });

  describe("endpoint presets", () => {
    it("only targets this app's own /api surface", async () => {
      const { API_ENDPOINT_PRESETS } = await import("./endpoints");
      for (const preset of API_ENDPOINT_PRESETS) {
        expect(preset.path.startsWith("/api/")).toBe(true);
      }
    });

    // The sandbox rejects these server-side; offering one in the picker would
    // hand the operator a button that always errors.
    it("never offers an admin console endpoint", async () => {
      const { API_ENDPOINT_PRESETS } = await import("./endpoints");
      for (const preset of API_ENDPOINT_PRESETS) {
        expect(preset.path.startsWith("/api/admin/")).toBe(false);
      }
    });

    it("assigns unique preset ids", async () => {
      const { API_ENDPOINT_PRESETS } = await import("./endpoints");
      const ids = API_ENDPOINT_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("provides valid JSON for every sample body", async () => {
      const { API_ENDPOINT_PRESETS } = await import("./endpoints");
      for (const preset of API_ENDPOINT_PRESETS) {
        if (preset.sampleBody) {
          expect(() => JSON.parse(preset.sampleBody as string)).not.toThrow();
        }
      }
    });
  });
});
