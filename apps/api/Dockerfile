FROM node:20-bookworm-slim

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/rule-engine/package.json packages/rule-engine/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages packages
RUN DATABASE_URL='mongodb://localhost:27017/laudo' npm --workspace apps/api run db:generate
RUN npm --workspace packages/contracts run build && npm --workspace packages/rule-engine run build
RUN npm run build --workspace apps/api

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npm --workspace apps/api run db:push && npm --workspace apps/api run db:backfill:evaluations && node apps/api/dist/main.js"]
