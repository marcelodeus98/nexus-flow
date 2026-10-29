FROM node:22-alpine AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

# Static files only. On the VPS, the edge Caddy routes /api and /socket.io to the API.
FROM caddy:2.11-alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80
