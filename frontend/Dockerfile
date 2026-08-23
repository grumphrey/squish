# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# React gets built into static files (note: vite uses dist/)
RUN npm run build

FROM nginx:1.29-alpine

# built static files
COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.prod.conf.template /etc/nginx/templates/default.conf.template
