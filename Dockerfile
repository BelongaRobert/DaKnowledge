FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY config.yaml ./
COPY api ./api
COPY src ./src
COPY data ./data
COPY website/docs ./website/docs

ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 4021

CMD ["node", "api/server.js"]
