FROM node:22-slim

WORKDIR /app

# Install dependencies and build the Vite frontend
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build && chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3000

USER node

EXPOSE 3000

CMD ["node", "server.mjs"]
