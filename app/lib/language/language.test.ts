 
import { describe, it, mock, before } from "node:test";
import { expect } from "expect";

// ─── Mock React's cache() ─────────────────────────────────────────────────────
// In Node.js there is no React request context, so we replace cache() with a
// simple identity wrapper so the underlying async function can be called directly.
mock.module("react", {
  namedExports: {
    cache: (fn: Record<string, unknown>) => fn,
  },
});

// ─── Module under test ────────────────────────────────────────────────────────
let getDictionary: unknown;
let formatMessage: unknown;
let type_Locale: unknown; // used only for type annotation checks at runtime

before(async () => {
  const mod = await import("./language");
  getDictionary = mod.getDictionary;
  formatMessage = mod.formatMessage;
});

// ─── getDictionary ────────────────────────────────────────────────────────────
describe("language utils", () => {
  describe("getDictionary", () => {
    it("should load the English dictionary when lang is 'en'", async () => {
      const dict = await getDictionary("en");
      expect(dict).toBeDefined();
      expect(typeof dict).toBe("object");
    });

    it("should load the Turkish dictionary when lang is 'tr'", async () => {
      const dict = await getDictionary("tr");
      expect(dict).toBeDefined();
      expect(typeof dict).toBe("object");
    });

    it("should fall back to English for an unsupported locale", async () => {
      const dictFallback = await getDictionary("de"); // German — not supported
      const dictEn = await getDictionary("en");

      // Both should have the same top-level keys
      expect(Object.keys(dictFallback)).toEqual(Object.keys(dictEn));
    });

    it("should fall back to English for an empty string", async () => {
      const dictFallback = await getDictionary("");
      const dictEn = await getDictionary("en");

      expect(Object.keys(dictFallback)).toEqual(Object.keys(dictEn));
    });

    it("should fall back to English for a completely random locale string", async () => {
      const dictFallback = await getDictionary("xyz-INVALID");
      const dictEn = await getDictionary("en");

      expect(Object.keys(dictFallback)).toEqual(Object.keys(dictEn));
    });

    it("English dictionary should contain expected top-level sections", async () => {
      const dict = await getDictionary("en");
      // Validate that key sections are present
      expect(dict).toHaveProperty("common");
      expect(dict).toHaveProperty("auth");
      expect(dict).toHaveProperty("sidebar");
    });

    it("Turkish dictionary should contain the same top-level sections as English", async () => {
      const dictEn = await getDictionary("en");
      const dictTr = await getDictionary("tr");

      const enKeys = Object.keys(dictEn).sort();
      const trKeys = Object.keys(dictTr).sort();

      expect(trKeys).toEqual(enKeys);
    });

    it("English dictionary common section should have basic keys", async () => {
      const dict = await getDictionary("en");
      expect(dict.common).toBeDefined();
      expect(typeof dict.common).toBe("object");
    });

    it("Turkish dictionary should have different values from English for common keys", async () => {
      const dictEn = await getDictionary("en");
      const dictTr = await getDictionary("tr");

      // The dictionaries should have the same keys but different translated values
      // At least one value should differ between the two
      const enValues = JSON.stringify(dictEn.common);
      const trValues = JSON.stringify(dictTr.common);

      expect(enValues).not.toBe(trValues);
    });
  });

  // ─── formatMessage ──────────────────────────────────────────────────────────
  describe("formatMessage", () => {
    it("should replace a single placeholder", () => {
      const result = formatMessage("Hello, {name}!", { name: "World" });
      expect(result).toBe("Hello, World!");
    });

    it("should replace multiple placeholders", () => {
      const result = formatMessage(
        "Dear {firstName} {lastName}, you have {count} messages.",
        { firstName: "John", lastName: "Doe", count: 5 }
      );
      expect(result).toBe("Dear John Doe, you have 5 messages.");
    });

    it("should replace a number value placeholder", () => {
      const result = formatMessage("You have {count} items.", { count: 42 });
      expect(result).toBe("You have 42 items.");
    });

    it("should replace a boolean value placeholder", () => {
      const result = formatMessage("Active: {isActive}", { isActive: true });
      expect(result).toBe("Active: true");
    });

    it("should leave any placeholders intact", () => {
      const result = formatMessage("Hello, {any}!", { name: "World" });
      expect(result).toBe("Hello, {any}!");
    });

    it("should handle a template with no placeholders", () => {
      const result = formatMessage("No placeholders here.", { name: "World" });
      expect(result).toBe("No placeholders here.");
    });

    it("should handle an empty template string", () => {
      const result = formatMessage("", { name: "World" });
      expect(result).toBe("");
    });

    it("should handle an empty values object", () => {
      const result = formatMessage("Hello, {name}!", {});
      // Unknown keys → left as-is
      expect(result).toBe("Hello, {name}!");
    });

    it("should handle multiple occurrences of the same placeholder", () => {
      const result = formatMessage("{greeting}! {greeting}!", {
        greeting: "Hi",
      });
      expect(result).toBe("Hi! Hi!");
    });

    it("should handle placeholder with value of 0 (falsy number)", () => {
      const result = formatMessage("Count: {count}", { count: 0 });
      expect(result).toBe("Count: 0");
    });

    it("should handle placeholder with value of false (falsy boolean)", () => {
      const result = formatMessage("Active: {active}", { active: false });
      expect(result).toBe("Active: false");
    });

    it("should not replace placeholders with special regex characters in key", () => {
      // Keys are matched via \w+ (word chars only), special chars won't match
      const result = formatMessage("Value: {key.nested}", { "key.nested": "test" });
      // {key.nested} has a dot, \w+ won't match "key.nested"
      expect(result).toBe("Value: {key.nested}");
    });
  });
});
