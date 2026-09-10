FROM node:22.22.2-alpine3.23 AS ui

WORKDIR /src/frontend
COPY services/frontend/package.json services/frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY services/frontend/ ./
RUN npm run build

FROM golang:1.27.0-alpine3.23 AS dependencies

WORKDIR /src
COPY services/api-server/go.mod services/api-server/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY services/api-server/ ./
RUN --mount=type=cache,target=/go/pkg/mod go mod vendor

FROM dependencies AS build
COPY --from=ui /src/frontend/dist ./internal/webui/dist
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -mod=vendor -tags=embedui -buildvcs=false -trimpath -o /out/api-server ./cmd

FROM scratch

WORKDIR /app
COPY --from=build --chown=10001:10001 /out/api-server /app/api-server
COPY --chown=10001:10001 services/api-server/config.docker.yaml /app/config.yaml
COPY --chown=10001:10001 services/api-server/migrations /app/migrations

EXPOSE 8080
USER 10001:10001
ENTRYPOINT ["/app/api-server"]
