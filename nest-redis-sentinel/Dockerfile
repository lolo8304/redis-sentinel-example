FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies and build the application
COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src ./src

RUN npm run build
RUN npm prune --omit=dev

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install redis-cli for in-pod diagnostics
RUN apk add --no-cache redis

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
