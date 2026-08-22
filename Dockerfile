FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./

# BuildKit npm cache ile indirme sürelerini dramatik olarak hızlandırır:
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

RUN rm -f /app/.env /app/.env.local /app/.env.production

EXPOSE 3000
CMD ["node", "server.js"]
