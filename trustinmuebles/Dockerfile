# --- Etapa 1: compilación del frontend ---
FROM node:22-alpine AS build
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# --- Etapa 2: nginx sirve los estáticos y reenvía /api al backend ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /src/dist /usr/share/nginx/html
# Dirección del backend dentro de la red de Docker (nombre del servicio en el compose).
ENV BACKEND_URL=http://backend:8080
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
