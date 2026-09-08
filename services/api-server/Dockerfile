FROM golang:1.27.0-alpine3.23 AS build

WORKDIR /src

COPY go.mod go.sum ./
COPY vendor ./vendor
COPY . .

RUN CGO_ENABLED=0 go build -mod=vendor -buildvcs=false -trimpath -o /out/api-server ./cmd

FROM scratch

WORKDIR /app

COPY --from=build --chown=10001:10001 /out/api-server /app/api-server
COPY --chown=10001:10001 config.docker.yaml /app/config.yaml
COPY --chown=10001:10001 migrations /app/migrations

EXPOSE 8080

USER 10001:10001

ENTRYPOINT ["/app/api-server"]
