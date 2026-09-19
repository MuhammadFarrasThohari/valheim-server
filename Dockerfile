FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY client ./client
RUN npm run build

FROM node:22-bookworm-slim AS production

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libatomic1 libpulse0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    VALHEIM_DIR=/opt/valheim \
    VALHEIM_EXECUTABLE=/opt/valheim/valheim_server.x86_64 \
    VALHEIM_DATA_DIR=/data

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server ./server
COPY --chown=node:node --from=build /app/client/dist ./client/dist
COPY --chown=node:node valheim-server /opt/valheim

RUN mkdir -p /data \
    && chown node:node /data \
    && test -x /opt/valheim/valheim_server.x86_64

USER node
VOLUME ["/data"]
EXPOSE 3000/tcp 2456/udp 2457/udp 2458/udp

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
