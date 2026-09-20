# Frontend verification — 2026-09-20

The new frontend replaces the previous implementation. The previous source and pre-existing repository changes are preserved in `.snapshots.local/2026-09-20-before-figma/`. Backend source code was not changed.

## Completed checks

| Check | Result |
| --- | --- |
| Generated OpenAPI contract drift | Passed |
| TypeScript | Passed |
| ESLint | Passed |
| Unit tests: request adapters, pagination and graph | 15 passed |
| Playwright fixture scenarios | 13 passed |
| Playwright against a disposable real API/PostgreSQL instance | 1 passed, with the workspace deletion limitation below |
| Production build | Passed; output in `dist` |
| Layout and navigation at 1440, 1024 and 390 px | Passed; screenshots reviewed against Figma |
| `gofmt -w . && go test -race ./...` in the isolated backend copy | Passed |
| `go vet ./...` in the isolated backend copy | Passed |
| `go test -race -tags=embedui ./internal/webui` and embedded binary build | Passed |
| `golangci-lint run` in the isolated backend copy | Existing failure described below |

The browser scenarios cover workspace creation/error/fallback, product and component creation, independent API exposure, API/client editing and deletion, binding/reload/API removal, 105 components, network failures, binding conflicts, draft cancellation, legacy/direct routes, two tabs, keyboard navigation, map dragging and persistence, neighborhood mode, and dialogs in fullscreen. Global development screens work without a workspace.

The final mobile review found a component-table overflow. The table now scrolls inside its container; all three viewport checks passed again, including a document-width assertion on the Components page.

Visual evidence is retained locally in `.verification.local/visual/`. It contains test-only fixture data. Backend test logs are retained in `.verification.local/logs/`.

## Known limitations

- OpenAPI includes `DELETE /v1/workspaces/{workspace_id}`, but the current backend does not register it. The frontend implements that contract and fixture tests cover deletion and active-workspace fallback. The real server returns 404; the frontend preserves the workspace and displays the error. The real API test records this contract gap, and its disposable database is destroyed after verification. A backend change is required to enable deletion.
- The existing Go lint failure is `cmd/main.go:31:3: exitAfterDefer (gocritic)`: `os.Exit` prevents the deferred `stop()` call. No backend changes were made to resolve it.
- Vite warns about bundle size: the main JavaScript bundle is approximately 914 kB before gzip; the lazily loaded ELK bundle is approximately 1.43 MB. The production build succeeds.

Repository URL and client Description remain disabled as agreed. Dashboard, Templates, Teams, Settings, Threat modeling and Security checks intentionally show **In development**.

## Review fixes — 2026-09-21

- Infrastructure now uses the Figma table structure: Name with an Importancy badge, API resources, Endpoints, Description and Show on map. System filtering and direct infrastructure creation remain functional.
- Component details follow frame `5041:14686`: metadata, shared architecture preview, API/client tables and dependencies. Add API and Add client are accessible icon buttons beside the counts; existing edit, delete, bind and security navigation remain available.
- Product Overview and Components share identical heading/tab dimensions. Duplicate Criticality was removed; missing service repository URLs show an em dash. Create service uses a plus icon.
- Figma was updated in place: the duplicate product Criticality fact was removed and the component API/client actions became compact plus buttons. Updated screenshots were inspected.
- TypeScript, ESLint, production build, 19 unit tests and 21 Playwright scenarios passed. Layout regression checks cover 1440, 1024, 757 and 390 px. Screenshots are in `/private/tmp/alpa-infrastructure-*.png` and `/private/tmp/alpa-component-*.png`.
- A separate read-only browser check against the running local API passed for Services, Infrastructure, component details, Architecture and reload, with no uncaught browser errors. The destructive real-API scenario was not rerun against the user's data; the full creation/binding/deletion flow passed with isolated browser fixtures.
- Required Go checks ran on an isolated copy of the current backend: formatting plus race tests, vet, embedui tests and embedded binary build passed. The existing `cmd/main.go:31:3 exitAfterDefer` lint failure remains. Backend source in the workspace was not modified.
