 
import { describe, it, before } from "node:test";
import { expect } from "expect";

describe("Robots Generate", () => {
  let robots: unknown;

  before(async () => {
    const mod = await import("./robots");
    robots = mod.default;
  });

  it("should_ReturnCorrectRobotsConfig", () => {
    const result = robots();

    expect(result.rules[0].userAgent).toBe("*");
    expect(result.rules[0].allow).toBe("/");
    expect(result.rules[0].disallow).toEqual([
      "/api",
      "/_next",
      "/static",
      "/dashboard",
      "/*/dashboard",
      "/auth",
      "/*/auth",
      "/giris",
      "/*/giris",
      "/demo",
      "/*/demo",
      "/onboarding",
      "/*/onboarding",
      "/pending-access",
      "/*/pending-access",
      "/playground",
      "/*/playground",
      "/driver-console",
      "/*/driver-console",
      "/warehouse-worker",
      "/*/warehouse-worker",
    ]);
    expect(result.sitemap).toContain("/sitemap.xml");
  });

  it("should_AllowAiCrawlersOnMarketingPages_ButBlockGatedSurfaces", () => {
    const result = robots();

    // Policy (see robots.ts): marketing content is crawlable by AI answer
    // engines too — only login-gated app surfaces are off-limits.
    const gptBot = result.rules.find(
      (r: { userAgent: string }) => r.userAgent === "GPTBot"
    );
    expect(gptBot).toBeDefined();
    expect(gptBot.allow).toBe("/");
    expect(gptBot.disallow).toContain("/dashboard");
    expect(gptBot.disallow).toContain("/*/dashboard");
    expect(gptBot.disallow).toContain("/api");
    expect(gptBot.disallow).not.toContain("/");
  });
});
