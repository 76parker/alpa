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

## Integrations API update — 2026-09-21

- Regenerated frontend types from the current backend OpenAPI contract. Clients now expose an `integrations` array; obsolete client role/action fields and the binding endpoint are no longer used.
- A client can integrate with several APIs through the component menu or architecture ports. Each integration has its own graph edge and communication-compatible action. Duplicate client/API pairs are rejected.
- The integration panel supports editing or clearing its multilingual description through `PATCH /v1/integrations/{id}`, and confirmed deletion through `DELETE /v1/integrations/{id}`. Failed requests retain the draft or confirmation for retry.
- Verification: 30 unit tests passed, and all 27 selected Playwright scenarios passed across the initial run and focused reruns after updating obsolete assertions. The 1:N scenario covers creation from the map, separate actions/descriptions, duplicates, reload persistence, editing/clearing, cancellation, server failures and deletion without removing the other integration, client or APIs.
- TypeScript, ESLint, production build and generated-contract checks passed. The Vite bundle-size warning remains. Integration screenshots were inspected at `/private/tmp/alpa-integrations-details.png`.
- Browser tests used isolated API fixtures, not the user's live data. Backend code and the running container were not changed; Go checks were not repeated for this frontend-only update. The local `dist` build must be included in a new server/container build to update an embedded frontend.

## Architecture group selection — 2026-09-21

- Select mode supports box selection, Shift-click, Select all for visible components, Clear selection and Escape. Port actions are inactive in this mode so group gestures do not create integrations or move individual ports.
- Dragging the selected group preserves relative positions and saves every moved component locally. Normal map interaction resumes when Select is turned off.
- Delete selected confirms the component count and cascaded API/client/integration removal. Requests use the existing component deletion endpoint. Partial failures remain selected; retry only requests failed IDs, and already-deleted components are handled as completed.
- Passed: TypeScript, ESLint, 30 unit tests, production build and 19 distinct browser scenarios across the focused runs (selection, integration, map regression and inventory suites). New tests cover box selection, shared movement and reload, Shift-click, cancellation, partial failures/retry, unselected components and filtering. Screenshot: `/private/tmp/alpa-map-selection.png`.
- All browser mutations used isolated fixtures. Backend source and the running container were unchanged. The existing bundle-size warning remains.

## Proxy infrastructure and dashboard proposal — 2026-09-22

- Nginx, Envoy, Traefik and HAProxy use `proxy/load-balancer`. Infrastructure creation and existing component details/map panels allow only HTTP proxy and gRPC proxy clients for this classification. Other infrastructure cannot submit clients; changing a draft to a non-proxy system clears unsupported clients.
- Proxy integrations send `action: proxy` automatically. Single-action clients no longer need an Action selector; event clients retain the produce/consume choice.
- Bottom ports now render in the card footer, with their handles at the lowest container. System/Importancy labels no longer have the extra left indent.
- The checked-in OpenAPI still lacks the proxy names, action and technology type. Frontend adapter types add these known backend values without modifying the generated contract or backend files.
- Backend caveat: `ComponentClient.SupportsAction` currently falls through from its proxy guard to the request-response branch, which only accepts `call`. It must return the proxy comparison directly for proxy clients. Real proxy integration creation remains dependent on that server fix; browser tests use isolated API fixtures.
- Passed: ESLint, TypeScript, production build, generated-contract check, 66 unit tests and 12 distinct browser scenarios across focused runs. The existing bundle-size warning remains. Go checks were not run because this update changes only frontend code. No live inventory data or running container was changed.
- Editable Figma proposals: component dashboard `5273:11344` and map panel `5273:11375`, in file `Os1G7QKEwCmfC3MFtlSqMr`. Both were visually inspected. The user requested changes to the proposal before implementation; no API/client dashboard redesign has been applied to frontend.

## API field removal — 2026-09-22

- API forms and requests now contain only `api_type` and `network_exposure`; responses additionally contain `id`. Removed API name, description and documentation fields from creation, editing, tables, previews and hover details. Component and integration descriptions remain supported.
- API labels use type, exposure and ID, including architecture ports and integration selection. Service tables display ID, type and network exposure. Draft layouts match the reduced field count.
- Regenerated types from the current backend OpenAPI. Passed TypeScript, ESLint, production build, contract drift check and 69 unit tests. All 35 selected browser scenarios passed across the initial run and focused rerun; the two initial failures were test selectors that omitted the action button from a table cell's accessible name. The final 11-scenario rerun passed.
- Browser checks used isolated HTTP fixtures and verified exact create/update payloads for backend, frontend and infrastructure APIs. Desktop/mobile screenshots and the creation form were visually inspected. No live inventory data was modified.
- `gofmt -w . && go test -race ./...` was attempted in the frontend directory; Go tests cannot run there because it contains no Go module. Go vet/lint were not run for this frontend-only change. The existing Vite bundle-size warning remains.

## Left architecture tools and stacked ports — 2026-09-22

- Replaced the horizontal toolbar with a 60px left rail. Selection, bulk deletion/retry, integration creation/appearance, component creation and filters use the existing canvas state and handlers. One contextual panel opens beside its tool. Keyboard navigation, focus restoration, Escape priority, gesture isolation and fullscreen menus are covered by browser tests.
- All map cards now stack full-width API rows above Clients. APIs show their type, name and transport in Geist, without exposure. Square handles support direct connection dragging; connection sides follow node positions automatically. Node positions and viewport still persist. Earlier freely positioned badge coordinates no longer control the new row layout.
- The current OpenAPI restores required API `name`; regenerated types and updated creation/editing validation (20 non-whitespace characters). Transport follows the backend `resolveTransportProtocol` mapping: native protocol is TCP/UDP, other API types are TCP. The HTTP projection does not expose transport yet. Connection appearance remains browser-local per integration.
- Preselected map targets no longer need a Target API selector in the review dialog; creation from component details still permits choosing a target. Arrow controls are in the left integration tool. Infrastructure empty endpoints are centered and Show on map is larger.
- Passed TypeScript, ESLint, 76 unit tests, production build and generated OpenAPI drift check. The full browser run passed 47 scenarios; its remaining legacy-details fixture still used the removed client binding format. After updating that fixture to the current integration projection, its focused rerun passed. All 48 enabled browser scenarios therefore passed across these runs; the final three tool/gesture/fullscreen scenarios also passed again. The opt-in real API/database scenario was skipped. Screenshots were inspected at desktop and mobile sizes.
- `gofmt -w . && go test -race ./...` and `go vet ./... && golangci-lint run` were attempted in the frontend directory. Go tests/vet cannot run there because it has no Go module; the chained golangci-lint command was not reached. Backend files and live inventory were not modified. Vite's existing large-chunk warning remains.
