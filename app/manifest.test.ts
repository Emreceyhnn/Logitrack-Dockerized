 
import { describe, it, before } from "node:test";
import { expect } from "expect";

describe("Manifest Generate", () => {
  let manifest: unknown;

  before(async () => {
    const mod = await import("./manifest");
    manifest = mod.default;
  });

  it("should_ReturnCorrectManifestConfig", () => {
    const result = manifest();
    
    expect(result.name).toBe("LogiTrack AI Logistics");
    expect(result.start_url).toBe("/");
    expect(result.display).toBe("standalone");
    expect(result.icons[0].src).toBe("/logo.svg");
  });
});
