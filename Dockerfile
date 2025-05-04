FROM node:20-alpine AS base
WORKDIR /usr/src/app

COPY package*.json ./

FROM base AS deps
RUN npm ci --omit=dev

FROM base AS builder
RUN npm ci

COPY . .

RUN npm run build

FROM base AS release
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY package*.json ./

EXPOSE 3000

CMD ["node", "dist/main"]
