 
import { describe, it, mock, before, after } from "node:test";
import { expect } from "expect";

// ─── Setup: Mock FileReader (browser API not available in Node.js) ─────────────
// fileUtils.ts uses FileReader which is a browser-only API.
// We mock it at the global level before importing the module.

let fileToBase64: (file: File) => Promise<string>;

before(async () => {
  // Provide a minimal FileReader mock on globalThis
  (globalThis as unknown).FileReader = class MockFileReader {
    result: string | ArrayBuffer | null = null;
    onload: (() => void) | null = null;
    onerror: ((e: Record<string, unknown>) => void) | null = null;

    readAsDataURL(file: Blob) {
      // Simulate async read via microtask
      Promise.resolve().then(() => {
        this.result = `data:text/plain;base64,${Buffer.from("mock-content").toString("base64")}`;
        if (this.onload) this.onload();
      });
    }
  };

  const mod = await import("./fileUtils");
  fileToBase64 = mod.fileToBase64;
});

after(() => {
  // Cleanup the mock
  delete (globalThis as unknown).FileReader;
});

// ─── fileToBase64 ────────────────────────────────────────────────────────────
describe("fileUtils", () => {
  describe("fileToBase64", () => {
    it("should return a data URL string for a given File", async () => {
      const file = new File(["hello world"], "test.txt", { type: "text/plain" });
      const result = await fileToBase64(file);

      expect(typeof result).toBe("string");
      expect(result.startsWith("data:")).toBe(true);
    });

    it("returned string should contain base64 content", async () => {
      const file = new File(["hello world"], "test.txt", { type: "text/plain" });
      const result = await fileToBase64(file);

      expect(result).toContain("base64");
    });

    it("should resolve (not reject) on successful read", async () => {
      const file = new File(["test data"], "image.png", { type: "image/png" });
      await expect(fileToBase64(file)).resolves.toBeDefined();
    });

    it("should reject when FileReader fires onerror", async () => {
      // Override FileReader temporarily to simulate an error
      const original = (globalThis as unknown).FileReader;
      (globalThis as unknown).FileReader = class ErrorFileReader {
        onload: (() => void) | null = null;
        onerror: ((e: Record<string, unknown>) => void) | null = null;

        readAsDataURL(_file: Blob) {
          Promise.resolve().then(() => {
            if (this.onerror) this.onerror(new Error("Read failed"));
          });
        }
      };

      const file = new File(["bad"], "bad.txt", { type: "text/plain" });
      await expect(fileToBase64(file)).rejects.toBeDefined();

      // Restore
      (globalThis as unknown).FileReader = original;
    });
  });
});
