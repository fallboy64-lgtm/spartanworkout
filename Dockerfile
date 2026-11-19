# Stage 1: Build frontend with Node 22 (Debian slim for full native Tailwind v4 compatibility)
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# Stage 2: Minimal runtime image (no devDependencies or build tools needed)
FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "server.mjs"]
