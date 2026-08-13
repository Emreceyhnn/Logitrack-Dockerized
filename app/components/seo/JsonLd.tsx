import React from "react";

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Escapes characters that would let a `<script>` payload break out of the
 * JSON-LD block. `JSON.stringify` does not escape `<`, so a value containing
 * `</script>` (or an HTML comment `<!--`) would otherwise close the tag early
 * and inject markup. Encoding `<`/`>`/`&` as unicode escapes keeps the JSON
 * byte-for-byte valid while making injection impossible by construction.
 */
function serializeJsonLd(data: JsonLdProps["data"]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * JsonLd component to inject Schema.org structured data into the page.
 */
const JsonLd: React.FC<JsonLdProps> = ({ data }) => {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
};

export default JsonLd;
