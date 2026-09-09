# The gate has no runtime dependencies, so there is no install step and no
# lockfile to trust. The image is the source plus a Node runtime.
FROM node:22-alpine

# node:sqlite is behind a flag on Node 22. It is the reason this pins 22 rather
# than tracking latest: the flag name is what the test suite runs against.
ENV NODE_OPTIONS=--experimental-sqlite

WORKDIR /app
COPY package.json ./
COPY src ./src

# The nullifier store is the one-credit-per-human record. It lives on a volume
# because losing it means every human can claim again.
RUN mkdir -p /data && chown -R node:node /data
VOLUME ["/data"]
ENV GATE_DB_PATH=/data/nullifiers.db
ENV GATE_PORT=8787

USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=4s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
