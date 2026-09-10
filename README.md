# Alpa Security Platform

Alpa brings development and security teams into one workspace to maintain products, components, and API relationships.

![Alpa products workspace](docs/assets/alpa-products.png)

## Run with Docker

From the repository root, with Docker Compose available:

```sh
docker compose up --build
```

Open **http://localhost:8080**. The Go service serves the React UI and `/v1` API on the same address; API documentation is at `/docs`. The multi-stage build compiles the Vite SPA, embeds it in the Go binary, and produces a non-root `scratch` runtime. Node.js is needed only during the build.

`API_SERVER_PORT` changes the exposed application port and `POSTGRES_PORT` changes the exposed database port. PostgreSQL data lives in the existing `postgres-data` volume and survives container restarts and ordinary `docker compose down`. Do not use `down --volumes` when retaining data.

When upgrading an existing deployment that still has a separate frontend container, use `docker compose up --build --remove-orphans` to remove that obsolete service. The application no longer listens on port 3000. This changes the browser origin, so the saved active workspace does not transfer from port 3000; server data remains in PostgreSQL. Workspace selection uses the existing saved-choice / `default` / first-workspace rule.

## Local development

Requirements: Go 1.27, Node.js 22.13 or later, npm, Make, and PostgreSQL. The Docker build pins Node.js 22.22.2 and Go 1.27.0.

Prepare dependencies and a local configuration from the repository root:

```sh
make deps
docker compose up -d postgres
```

`make deps` runs `npm ci`, downloads Go modules, prepares the ignored `vendor` directory, and creates `services/api-server/config.yaml` from `config.example.yaml` only if it is absent. Review that file for your database settings. For local development it must contain:

```yaml
http:
  address: "localhost:8080"
  ui_assets_dir: "../frontend/dist"
```

If you already have a configuration from before the SPA migration, add `ui_assets_dir` to its existing `http` section. Paths are relative to the Go process working directory, not to the configuration file. Stop any container occupying the application port, or choose a different local `http.address`.

Run in two terminals from the repository root:

```sh
# Terminal 1: wait for the first successful frontend build.
make watch
```

```sh
# Terminal 2: start Go from services/api-server.
make dev
```

Open the configured Go address. Vite watches and rebuilds files on disk; manually refresh the browser after a successful rebuild. Go reads the new assets without a restart and sends `Cache-Control: no-store` in this mode. Restart `make dev` after Go changes, and restart `make watch` after Vite configuration changes.

There is no Vite HTTP server, API proxy, or CORS setup. The browser calls relative `/v1/...` URLs directly. Direct navigation and refresh on nested UI routes work through Go's HTML navigation fallback. API paths, missing assets, and removed frontend service paths return errors instead of the SPA.

## Build a standalone application

```sh
make deps
make build
```

The executable is `bin/api-server`. `make build` builds the frontend, replaces the ignored `services/api-server/internal/webui/dist` resources, and compiles with `-tags=embedui`. Distribute the executable together with a `config.yaml` and the Go service's `migrations/` directory. Start it from the directory containing those two resources. Set `http.ui_assets_dir: ""` in its configuration to use embedded assets, and configure PostgreSQL for the target environment. No frontend files or Node.js are required at runtime.

Without `embedui`, ordinary Go tests compile without a frontend build. Running such a binary requires a valid `http.ui_assets_dir`. Startup reports a missing UI or `index.html` before connecting to PostgreSQL.

## Checks

```sh
cd services/frontend
npm test
npm run typecheck
npm run lint
npm run build
```

```sh
cd services/api-server
go test -mod=vendor ./...
# After `make build` from the repository root:
go test -mod=vendor -tags=embedui ./...
```

The full Go suite requires Docker for PostgreSQL integration tests. Generated frontend files, embedded resources, dependencies, caches, and test reports are ignored by Git.

The supported screens, routes, persistence rules, and creation feedback are described in [the UX contract](services/frontend/UX-CONTRACT.md).
