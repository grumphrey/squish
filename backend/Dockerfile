# Base stage
FROM golang:1.26-alpine AS base
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

# Hot reloading
FROM base AS dev
RUN go install github.com/air-verse/air@latest
COPY . .
CMD ["air", "-c", ".air.toml"]

# Build stage
FROM base AS builder
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:3.22 AS prod
RUN apk add --no-cache ca-certificates tzdata # add root certs and timezone data into prod image
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
