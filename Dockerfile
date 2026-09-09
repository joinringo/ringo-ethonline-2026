# The public stats app. Every figure it shows is read from the subgraph at
# request time, so the only configuration it needs is SUBGRAPH_URL.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# The subgraph workspace is not needed to build the app and pulls a large
# toolchain, so it is deliberately not installed here.
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
USER node
EXPOSE 3000
CMD ["npx", "next", "start"]
