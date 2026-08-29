FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./


RUN --mount=type=cache,target=/root/.npm \
    npm install

COPY . .

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN --mount=type=secret,id=dotenv,target=/app/.env \
    npm run build


FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# The prisma CLI, kept apart from the app.
#
# `next build` only traces what the app imports at runtime, so the CLI is not in
# the standalone output — but the entrypoint needs it to run `migrate deploy`.
# The whole node_modules tree is copied rather than a hand-picked set of
# packages: the CLI pulls in transitive dependencies well outside the @prisma
# scope (effect, mysql2, postgres, ...), and every attempt to pin that list
# breaks on the next prisma upgrade, at container start rather than at build.

COPY --from=builder /app/node_modules /migrate/node_modules
COPY --from=builder /app/prisma /migrate/prisma

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN rm -f /app/.env /app/.env.local /app/.env.production

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
