#!/bin/sh
set -e

# Migrations run here, not at build time: the database does not exist while the
# image is being built, and baking a schema change into the image would make the
# build depend on a live database. Running them on start also means a redeploy
# and its schema change happen in one step, in the right order.
#
# `migrate deploy` (not `db push`) is what belongs in production: it applies the
# committed migration files and nothing else — no interactive prompts, no schema
# drift guesswork, and never a destructive reset.
#
# Run from /migrate, where the full node_modules lives: the prisma CLI needs
# dependencies that next build never traced into the app's own tree.
#
# The CLI is invoked through build/index.js rather than node_modules/.bin/prisma:
# the shim resolves its wasm files relative to its own directory, and .bin holds
# only symlinks, so it dies on a missing prisma_schema_build_bg.wasm.
#
# The config is docker.config.mjs, not the repo's prisma.config.ts: that one is
# TypeScript and imports dotenv to read a .env the runtime image deliberately
# does not have. A config file is required either way — schema.prisma declares
# no url, and Prisma 7 removed --datasource-url from `migrate deploy`, so the
# URL can only reach the CLI through the config. DATABASE_URL comes from compose.
echo "[entrypoint] Applying database migrations..."
: "${DATABASE_URL:?DATABASE_URL is not set}"
cd /migrate && node node_modules/prisma/build/index.js migrate deploy \
  --config prisma/docker.config.mjs
cd /app

echo "[entrypoint] Starting server..."
exec node server.js
