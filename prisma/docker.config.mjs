// Prisma config for the runtime image only — the app itself never loads this.
//
// prisma.config.ts (used on the dev machine) is TypeScript and imports dotenv to
// read a .env the runtime image deliberately does not have. A config file is
// required either way: schema.prisma declares no url, and Prisma 7 removed
// --datasource-url from `migrate deploy`. DATABASE_URL is injected by compose.
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Relative to this config file, not the cwd.
  schema: "schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
