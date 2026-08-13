import { describe, it } from "node:test";
import { expect } from "expect";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
global.React = React;
import JsonLd from "./JsonLd";

describe("JsonLd Component", () => {
  it("should_EmitValidLdJsonScript_WhenGivenData", () => {
    const html = renderToStaticMarkup(
      <JsonLd data={{ "@type": "Organization", name: "LogiTrack" }} />
    );

    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain("Organization");
    expect(html).toContain("LogiTrack");
  });

  it("should_EscapeScriptClosingTag_ToPreventInjection", () => {
    // A value containing </script> must not close the tag early — the raw
    // sequence must never appear in the emitted markup.
    const html = renderToStaticMarkup(
      <JsonLd data={{ name: "</script><script>alert(1)</script>" }} />
    );

    expect(html).not.toContain("</script><script>");
    expect(html).toContain("\\u003c/script");
  });

  it("should_EscapeHtmlComment_ToPreventInjection", () => {
    const html = renderToStaticMarkup(<JsonLd data={{ note: "<!--x-->" }} />);

    expect(html).not.toContain("<!--x-->");
    expect(html).toContain("\\u003c!--x--\\u003e");
  });

  it("should_ProduceParsableJson_AfterEscaping", () => {
    // The escaped output must still round-trip through JSON.parse — the
    // \\uXXXX escapes are valid JSON string escapes.
    const html = renderToStaticMarkup(
      <JsonLd data={{ name: "a < b & c > d" }} />
    );

    const inner = html.replace(/^.*<script[^>]*>/, "").replace(/<\/script>.*$/, "");
    const parsed = JSON.parse(inner) as { name: string };
    expect(parsed.name).toBe("a < b & c > d");
  });
});
