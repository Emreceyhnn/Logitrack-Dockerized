FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# `npm install`, not `npm ci`: the lockfile is generated on Windows and omits
# the linux-only optional binaries (@emnapi/*), which makes `ci` refuse to run.
RUN npm install
COPY . .
# Prisma's generate step only parses the URL, it never connects, so a dummy
# value is enough to get through `npm run build`. The real one arrives at
# runtime from compose, which overrides whatever is baked in here.
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# `.env` is mounted as a build secret rather than COPYed: NEXT_PUBLIC_* values
# are inlined into the client bundle by `next build`, so they MUST be present
# here — without them the browser gets `undefined` (Firebase then throws
# "invalid-api-key" on init and the page dies with a client-side exception).
# Build collection also evaluates modules that assert on KV_REST_API_*.
# A secret mount leaves nothing behind in the image layers; the DATABASE_URL
# line below still wins for the build because the app reads process.env first.
RUN --mount=type=secret,id=dotenv,target=/app/.env \
    npm run build


FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# `output: "standalone"` emits a self-contained server at .next/standalone with
# its own pruned node_modules, but Next deliberately leaves out public/ and
# .next/static/ — server.js resolves both relative to itself, so they have to be
# placed inside the standalone tree by hand or every asset 404s.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# `next build` copies the .env it saw into the standalone output, which would
# ship every server-side secret inside the image. Runtime config comes from
# compose, so drop it.
RUN rm -f /app/.env /app/.env.local /app/.env.production

EXPOSE 3000
CMD ["node", "server.js"]
