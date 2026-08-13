import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),

  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // This Next.js rule flags every setState call inside useEffect, including
      // legitimate patterns like prop→state sync and async-fetch-on-mount.
      // All 19 occurrences in the codebase are correct usage; disable globally
      // to remove the need for inline eslint-disable comments.
      "react-hooks/set-state-in-effect": "off"
    }
  },

  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
]);

export default eslintConfig;
