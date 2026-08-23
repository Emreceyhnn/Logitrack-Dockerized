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
echo "[entrypoint] Applying database migrations..."
cd /migrate && node node_modules/prisma/build/index.js migrate deploy
cd /app

echo "[entrypoint] Starting server..."
exec node server.js
