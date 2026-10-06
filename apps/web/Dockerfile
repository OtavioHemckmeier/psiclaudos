FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/rule-engine/package.json packages/rule-engine/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages packages
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace apps/web

FROM nginx:1.27-alpine
# O entrypoint do nginx gera /etc/nginx/conf.d/default.conf a partir do template,
# substituindo apenas variáveis de ambiente definidas (ex.: API_UPSTREAM).
ENV API_UPSTREAM=http://api:3000
RUN rm -f /etc/nginx/conf.d/default.conf
COPY infra/docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
