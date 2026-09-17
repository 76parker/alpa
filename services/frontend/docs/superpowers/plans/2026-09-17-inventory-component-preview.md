# Inventory Component API Alignment and Graph Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the Inventory UI with the current backend Component, API, and Client contract, then provide one reusable React Flow graph for product architecture and Component previews.

**Architecture:** The backend DTOs remain the frontend's single contract source. A neutral graph model separates stored Components and create-form drafts from the graph builder and React Flow renderer. Product Architecture retains editable saved layouts; Component visual views and creation previews use the same nodes in read-only mode.

**Tech Stack:** React 19, TypeScript 5.9, Vite, Vitest, Testing Library, PatternFly 6, `@xyflow/react`, Docker Compose, Go embed-ui image build.

**Spec:** [../specs/2026-09-17-inventory-component-preview-design.md](../specs/2026-09-17-inventory-component-preview-design.md)

## Global Constraints

- Use the backend routes and DTOs enumerated in the spec; do not infer routes or fields.
- Do not add dependencies or create a second API client/cache layer.
- Component types are exactly `backend-service`, `frontend-service`, and `infrastructure`; remove all legacy graph fallbacks.
- Do not render update or delete controls for APIs or Clients, because the backend does not implement their routes.
- Use the existing PatternFly wrappers and shared Architecture node styling.
- Form changes must not fetch; preview IDs must remain stable across edits and removals.
- Preserve Product navigation: Overview / Components / Threat modeling and Services / Infrastructure / Architecture.
- Verify locally, then rebuild and start `/Users/parkersec/go-projects/alpa/docker-compose.yaml` so the embedded UI is deployed with `api-server`.

---

## File structure

| File | Responsibility |
| --- | --- |
| `lib/inventory/contracts.ts` | Exact TypeScript backend request, response, enum, and label contracts. |
| `lib/inventory/client.ts` | The single HTTP client for Component aggregate, API, Client, and binding mutations. |
| `lib/inventory/client.test.ts` | Exact route and JSON body regression tests. |
| `components/inventory/component-input.tsx` | Canonical Component draft types, draft row identity, payload conversion, and binding candidates. |
| `components/inventory/component-input.test.tsx` | Unit tests for draft payload and valid Client choice helpers. |
| `lib/inventory/graph-model.ts` | Backend and draft adapters into the neutral graph model. |
| `lib/inventory/graph-model.test.ts` | Stable draft identity and adapter tests. |
| `lib/inventory/architecture-graph.ts` | Nodes, handles, edges, and layout derived only from neutral graph models. |
| `lib/inventory/architecture-graph.test.ts` | API/client edge and layout regression tests without legacy roles. |
| `components/inventory/architecture-canvas.tsx` | Shared Architecture node markup and React Flow canvas with interactive/read-only modes. |
| `components/inventory/architecture-map.tsx` | Product-only toolbar, localStorage layout persistence, and interactive canvas wrapper. |
| `components/inventory/architecture-map.styles.test.ts` | Assertion that all modes use the shared canvas and node classes. |
| `components/inventory/component-pages.tsx` | Component create form, visual view, supported API/Client actions, and dialogs. |
| `components/inventory/inventory-context.tsx` | Existing reducer-backed mutation wrappers that refresh Components. |
| `components/inventory/inventory-app.tsx` | Route wiring for updated Component page actions. |
| `components/inventory/inventory-app.test.tsx` | Screen-level payload, live-preview, mutation, and navigation tests. |
| `globals.css` | Two-column create layout and bounded read-only canvas sizing. |

## Task 1: Replace the stale inventory HTTP contract

**Files:**
- Modify: `lib/inventory/contracts.ts:1-184`
- Modify: `lib/inventory/client.ts:1-132`
- Modify: `lib/inventory/client.test.ts:1-62`
- Modify: `components/inventory/inventory-context.tsx:1-323`
- Test: `lib/inventory/client.test.ts`

**Interfaces:**
- Consumes: the current API routes listed in the specification.
- Produces: `CreateAPIInput`, `CreateClientInput`, `BindClientInput`, and accurate `Component`, `ComponentAPI`, and `ComponentClient` shapes for all later tasks.

- [ ] **Step 1: Add the contract tests that describe the current API.**

  Add requests that verify the following exact calls:

  ```ts
  await client.createComponent({
    product_id: 9,
    name: 'Checkout',
    type: 'backend-service',
    details: { language: 'Go' },
    apis: [{ name: 'Public', api_type: 'rest', network_exposure: 'internet' }],
    clients: [{ client_name: 'rest-client', role: 'caller', communication_type: 'request-response' }],
  });
  expect(request.url).toBe('/v1/components');
  expect(JSON.parse(String(request.init?.body))).toEqual({
    product_id: 9,
    name: 'Checkout',
    type: 'backend-service',
    details: { language: 'Go' },
    apis: [{ name: 'Public', api_type: 'rest', network_exposure: 'internet' }],
    clients: [{ client_name: 'rest-client', role: 'caller', communication_type: 'request-response' }],
  });

  await client.createComponentAPI(9, { name: 'Health', api_type: 'rest', network_exposure: 'internal' });
  expect(request.url).toBe('/v1/components/9/apis');

  await client.createComponentClient(9, { client_name: 'kafka-client', role: 'consumer', communication_type: 'events' });
  expect(request.url).toBe('/v1/components/9/clients');

  await client.bindComponentClient(9, 17, { api_id: 44 });
  expect(request.url).toBe('/v1/components/9/clients/17/bindings');
  ```

- [ ] **Step 2: Run the focused test and confirm it fails against the stale client.**

  Run: `npm test -- lib/inventory/client.test.ts`

  Expected: failures for missing methods and the old `/consumer-apis` expectation.

- [ ] **Step 3: Implement the exact TypeScript contract.**

  In `contracts.ts`:

  ```ts
  export type ComponentAPI = {
    id: number;
    name: string;
    api_type: APIType;
    network_exposure: NetworkExposure;
  };

  export type ComponentClient = {
    id: number;
    client_name: ComponentClientName;
    role: ClientRole;
    communication_type: CommunicationType;
    description: string;
    api_id: number | null;
  };

  export type CreateComponentInput = {
    product_id: number;
    name: string;
    type: ComponentType;
    details: ServiceDetailsInput | InfrastructureDetailsInput;
    description?: string;
    apis?: CreateAPIInput[];
    clients?: CreateClientInput[];
  };
  ```

  Remove `APIRole`, `role` on an API, optional `clients`, `ComponentClientType`, and `client_type`. Keep the 13 server API values, remove `event`, retain `event-consumer`, and add `s3-client` to client names. Add `ClientRole` and `CommunicationType` label/options arrays.

  In `client.ts`, remove `addConsumerAPI`; add `createComponentAPI`, `createComponentClient`, and `bindComponentClient` with the routes tested in Step 1. In context, expose mutation wrappers that await the client mutation and then call `refreshComponent(componentID)`.

- [ ] **Step 4: Run focused contract, context, and type checks.**

  Run: `npm test -- lib/inventory/client.test.ts components/inventory/inventory-context.test.tsx && npm run typecheck`

  Expected: all tests pass and TypeScript reports no use of removed contract fields.

- [ ] **Step 5: Commit the API alignment.**

  ```bash
  git add lib/inventory/contracts.ts lib/inventory/client.ts lib/inventory/client.test.ts components/inventory/inventory-context.tsx components/inventory/inventory-context.test.tsx
  git commit -m "feat: align inventory component API contract"
  ```

## Task 2: Define stable Component drafts and payload conversion

**Files:**
- Modify: `components/inventory/component-input.tsx:1-62`
- Create: `components/inventory/component-input.test.tsx`
- Test: `components/inventory/component-input.test.tsx`

**Interfaces:**
- Consumes: Task 1 `CreateAPIInput`, `CreateClientInput`, client enum types, and `CreateComponentInput`.
- Produces: `createComponentDraft`, `ComponentDraft`, `DraftAPI`, `DraftClient`, `buildComponentInput(productID, draft)`, `validClientOptions`, and `bindingCandidates` for graph adapters and component pages.

- [ ] **Step 1: Write draft-helper tests.**

  Test that a Client draft uses a key independent of its array index and that the aggregate payload omits empty collections:

  ```ts
  const draft = createComponentDraft({
    name: ' Checkout ',
    apis: [],
    clients: [],
    details: { language: ' Go ', languageVersion: '', framework: '' },
  });
  expect(buildComponentInput(9, draft)).toEqual({
    product_id: 9, name: 'Checkout', type: 'backend-service', details: { language: 'Go' },
  });
  expect(validClientOptions('kafka-client')).toEqual({
    roles: ['producer', 'consumer'], communications: ['events'],
  });
  expect(validClientOptions('websocket-client')).toEqual({
    roles: ['listener'], communications: ['stream'],
  });
  ```

- [ ] **Step 2: Run the focused helper test and confirm it fails.**

  Run: `npm test -- components/inventory/component-input.test.tsx`

  Expected: the helpers and aggregate Client payload do not yet exist.

- [ ] **Step 3: Implement immutable, keyed draft types and helpers.**

  Use a key generated only when a row is created:

  ```ts
  export type DraftAPI = CreateAPIInput & { key: string };
  export type DraftClient = CreateClientInput & { key: string };
  export type ComponentDraft = {
    key: string;
    name: string;
    type: ComponentType;
    description: string;
    details: ServiceDraft | InfrastructureDraft;
    apis: DraftAPI[];
    clients: DraftClient[];
  };

  export function createComponentDraft(initial: Partial<ComponentDraft> = {}): ComponentDraft;
  ```

  `buildComponentInput` trims text, maps rows without their `key`, omits empty `apis` and `clients`, and keeps existing optional detail behavior. Replace old consumer-API relationship candidates with `bindingCandidates(client, components)`, excluding an already bound Client and the Client's own component where appropriate.

- [ ] **Step 4: Run the helper suite and the current request-variant tests.**

  Run: `npm test -- components/inventory/component-input.test.tsx components/inventory/inventory-app.test.tsx`

  Expected: draft serialization and all unaffected UI tests pass.

- [ ] **Step 5: Commit the draft boundary.**

  ```bash
  git add components/inventory/component-input.tsx components/inventory/component-input.test.tsx components/inventory/inventory-app.test.tsx
  git commit -m "feat: add component aggregate draft model"
  ```

## Task 3: Make the graph builder backend-neutral and remove legacy branches

**Files:**
- Create: `lib/inventory/graph-model.ts`
- Create: `lib/inventory/graph-model.test.ts`
- Modify: `lib/inventory/architecture-graph.ts:1-286`
- Modify: `lib/inventory/architecture-graph.test.ts:1-220`
- Test: `lib/inventory/graph-model.test.ts`, `lib/inventory/architecture-graph.test.ts`

**Interfaces:**
- Consumes: Task 1 backend types and Task 2 drafts.
- Produces: `GraphComponent`, `toGraphComponent`, `toDraftGraphComponent`, and `buildArchitectureGraph(graphComponents)` for all canvases.

- [ ] **Step 1: Add adapter and graph tests before changing the builder.**

  Include a draft identity case and a client-edge case:

  ```ts
  expect(toDraftGraphComponent(draft).apis[0].id).toBe('draft-api-a');
  expect(toDraftGraphComponent({ ...draft, apis: [{ ...draft.apis[0], name: 'Renamed' }] }).apis[0].id).toBe('draft-api-a');

  const graph = buildArchitectureGraph([
    provider({ id: 'component-1', apis: [{ id: 'api-1', name: 'Public', apiType: 'rest' }] }),
    consumer({ id: 'component-2', clients: [{ id: 'client-1', clientName: 'rest-client', apiID: 'api-1' }] }),
  ]);
  expect(graph.edges[0]).toMatchObject({ source: 'component-2', target: 'component-1' });
  ```

  Assert that every API is visible as a provider and no test fixture needs `role`, `client_type`, or an undefined `clients` array.

- [ ] **Step 2: Run the graph tests and confirm the legacy implementation fails them.**

  Run: `npm test -- lib/inventory/graph-model.test.ts lib/inventory/architecture-graph.test.ts`

  Expected: missing adapters and type failures caused by the old `role` model.

- [ ] **Step 3: Add neutral graph DTOs and adapters.**

  In `graph-model.ts`, define the graph-only objects:

  ```ts
  export type GraphComponent = {
    id: string;
    componentID?: number;
    name: string;
    type: ComponentType;
    details: ServiceDetails | InfrastructureDetails;
    apis: GraphAPI[];
    clients: GraphClient[];
  };
  export type GraphAPI = { id: string; name: string; apiType: APIType; networkExposure: NetworkExposure };
  export type GraphClient = { id: string; clientName: ComponentClientName; role: ClientRole; communicationType: CommunicationType; description: string; apiID: string | null };
  ```

  Stored adapters use persisted numeric IDs as strings. Draft adapters use only `draft.key`, `draft-api-${row.key}`, and `draft-client-${row.key}`. They display a trimmed name or `Unnamed component`; no placeholder leaks to the create payload.

- [ ] **Step 4: Refactor the builder to use only `GraphComponent`.**

  Delete `newModel`, `buildLegacyEdges`, `legacyDependencyPositions`, `architectureAPIs`, `legacyClientType`, `consumerHandleID`, and all `role` checks. Always lay out component-type columns; register source handles for Clients and target handles for APIs. Update node IDs, handle IDs, test IDs, ARIA labels, widths, and queue/stream measurement to use graph string IDs.

- [ ] **Step 5: Run the focused graph tests and inspect legacy removal.**

  Run: `npm test -- lib/inventory/graph-model.test.ts lib/inventory/architecture-graph.test.ts && rg -n 'consumer-apis|client_type|api\.role|APIRole|legacy' lib/inventory components/inventory`

  Expected: graph tests pass; search has no stale runtime implementation references.

- [ ] **Step 6: Commit the shared graph model.**

  ```bash
  git add lib/inventory/graph-model.ts lib/inventory/graph-model.test.ts lib/inventory/architecture-graph.ts lib/inventory/architecture-graph.test.ts
  git commit -m "refactor: derive architecture graph from shared model"
  ```

## Task 4: Extract a reusable React Flow canvas with read-only mode

**Files:**
- Create: `components/inventory/architecture-canvas.tsx`
- Modify: `components/inventory/architecture-map.tsx:1-552`
- Modify: `components/inventory/architecture-map.styles.test.ts`
- Test: `components/inventory/architecture-map.styles.test.ts`

**Interfaces:**
- Consumes: Task 3 `ArchitectureGraph` and graph node data.
- Produces: `ArchitectureCanvas({ nodes, edges, ariaLabel, mode, onOpenComponentID? })` and the existing `ArchitectureMap` product wrapper.

- [ ] **Step 1: Add a renderer reuse test.**

  Render both modes and assert they contain the same node class and that read-only mode disables mutation-oriented behavior:

  ```tsx
  render(<ArchitectureCanvas nodes={graph.nodes} edges={graph.edges} ariaLabel="Draft preview" mode="read-only" />);
  expect(screen.getByTestId('architecture-node-draft-component')).toHaveClass('architecture-node-client-model');
  expect(screen.queryByRole('button', { name: /Open component/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /Move component/ })).toBeNull();
  ```

- [ ] **Step 2: Run the focused renderer test and confirm it fails.**

  Run: `npm test -- components/inventory/architecture-map.styles.test.ts`

  Expected: `ArchitectureCanvas` is not exported and there is only the product map.

- [ ] **Step 3: Move the common node renderer and React Flow shell.**

  Move `nodeTypes`, node cards, badges, tooltips, handles, and the common `ReactFlow` block from `architecture-map.tsx` to `architecture-canvas.tsx`. The node action context accepts an optional open callback and optional keyboard-move functions. In `read-only` mode it sets:

  ```tsx
  nodesDraggable={false}
  nodesConnectable={false}
  elementsSelectable={false}
  panOnDrag
  zoomOnScroll
  zoomOnPinch
  zoomOnDoubleClick={false}
  ```

  Keep `Background`, `Controls`, the current node markup/classes, and the current fit-view parameters. `ArchitectureMap` continues to own saved product positions, drag events, reset action, and its product-specific toolbar, passing the final node positions to the canvas.

- [ ] **Step 4: Run renderer and product architecture checks.**

  Run: `npm test -- components/inventory/architecture-map.styles.test.ts lib/inventory/architecture-graph.test.ts components/inventory/inventory-app.test.tsx`

  Expected: the product Architecture map still supports existing navigation and uses its saved layout; the read-only renderer shares its nodes.

- [ ] **Step 5: Commit canvas extraction.**

  ```bash
  git add components/inventory/architecture-canvas.tsx components/inventory/architecture-map.tsx components/inventory/architecture-map.styles.test.ts
  git commit -m "refactor: share architecture canvas across views"
  ```

## Task 5: Build the live aggregate-create form and preview

**Files:**
- Modify: `components/inventory/component-pages.tsx:109-174`
- Modify: `components/inventory/inventory-app.test.tsx`
- Modify: `globals.css:155-193,304-332`
- Test: `components/inventory/inventory-app.test.tsx`

**Interfaces:**
- Consumes: Task 2 draft/payload helpers, Task 3 draft graph adapter, and Task 4 read-only canvas.
- Produces: a two-column `ComponentCreatePage` that sends one aggregate request and makes no requests while previewing form changes.

- [ ] **Step 1: Add live-create regression tests.**

  Add a test that types a name, changes Component type, adds/removes an API and a Client, and then submits. Capture `fetch` and assert:

  ```ts
  expect(screen.getByTestId('architecture-preview')).toBeTruthy();
  expect(screen.getByText('Checkout API')).toBeTruthy();
  expect(screen.getByText('REST client')).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/v1/components'), expect.anything());
  await user.click(screen.getByRole('button', { name: 'Create component' }));
  expect(componentPosts).toHaveLength(1);
  expect(JSON.parse(String(componentPosts[0].init?.body))).toEqual(expect.objectContaining({
    apis: [{ name: 'Checkout REST', api_type: 'rest', network_exposure: 'internal' }],
    clients: [{ client_name: 'rest-client', role: 'caller', communication_type: 'request-response' }],
  }));
  ```

  Assert the preview remains mounted across a type switch, uses `Unnamed component` initially, and has no open/drag actions.

- [ ] **Step 2: Run the create-page test and confirm it fails.**

  Run: `npm test -- components/inventory/inventory-app.test.tsx`

  Expected: no preview or Client form exists and the aggregate payload lacks `clients`.

- [ ] **Step 3: Refactor the form around one Component draft.**

  Replace independent API state with one `ComponentDraft`. Create APIs and Clients with immutable `key` values. Render the existing labelled PatternFly form fields plus:

  ```tsx
  const graph = useMemo(
    () => buildArchitectureGraph([toDraftGraphComponent(draft)]),
    [draft],
  );

  <aside className="component-create-preview" aria-label="Component preview">
    <ArchitectureCanvas nodes={graph.nodes} edges={graph.edges} ariaLabel="Component preview" mode="read-only" />
  </aside>
  ```

  API rows use the current three backend fields. Client rows expose `client_name`, `role`, `communication_type`, and description; selecting a client name constrains role and communication selects with `validClientOptions`. Preserve values for shared fields during type changes; retain the draft canvas component and memoize graph input.

- [ ] **Step 4: Add compact responsive styling without changing node styling.**

  Add a scoped grid using `minmax(0, 1.1fr) minmax(360px, 0.9fr)`, a 12–16px gap, and a bounded preview canvas. At `max-width: 900px`, change it to one column and retain horizontal flow scrolling. Do not override shared node CSS.

- [ ] **Step 5: Run the Create page tests and type check.**

  Run: `npm test -- components/inventory/inventory-app.test.tsx && npm run typecheck`

  Expected: one composite post after a valid submit, no preview-fetch requests, retained values after a server rejection, and a passing type check.

- [ ] **Step 6: Commit the live creation experience.**

  ```bash
  git add components/inventory/component-pages.tsx components/inventory/inventory-app.test.tsx globals.css
  git commit -m "feat: preview component aggregates while creating"
  ```

## Task 6: Add current Component visual view and supported child mutations

**Files:**
- Modify: `components/inventory/component-pages.tsx:176-276`
- Modify: `components/inventory/inventory-app.tsx:92-169`
- Modify: `components/inventory/inventory-context.tsx:171-314`
- Modify: `components/inventory/inventory-app.test.tsx`
- Test: `components/inventory/inventory-app.test.tsx`

**Interfaces:**
- Consumes: Task 1 mutation wrappers, Task 2 Client rules/candidates, and Task 4 `ArchitectureCanvas`.
- Produces: Component details with a read-only visual view plus API creation, Client creation, and Client binding UI.

- [ ] **Step 1: Add end-to-end page tests for each supported mutation.**

  Mock the exact server lifecycle and assert the reducer-driven refresh changes both list and graph:

  ```ts
  await user.click(screen.getByRole('button', { name: 'Create API' }));
  await user.type(screen.getByRole('textbox', { name: 'API name' }), 'Health');
  await user.selectOptions(screen.getByRole('combobox', { name: 'API type' }), 'rest');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Network exposure' }), 'internal');
  await user.click(screen.getByRole('button', { name: 'Create API' }));
  expect(postedURL).toBe('/v1/components/101/apis');
  expect(getRequests).toContain('/v1/components/101');

  await user.click(screen.getByRole('button', { name: 'Create client' }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Client name' }), 'kafka-client');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'consumer');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Communication type' }), 'events');
  await user.click(screen.getByRole('button', { name: 'Create client' }));
  expect(postedBody).toEqual({ client_name: 'kafka-client', role: 'consumer', communication_type: 'events' });

  await user.click(screen.getByRole('button', { name: 'Bind client' }));
  expect(postedURL).toBe('/v1/components/101/clients/901/bindings');
  expect(screen.getByText('API #401')).toBeTruthy();
  ```

  Assert no Edit or Delete buttons appear for APIs/Clients and the Component visual view uses `architecture-preview` after each refreshed response.

- [ ] **Step 2: Run the Component page test and confirm it fails.**

  Run: `npm test -- components/inventory/inventory-app.test.tsx`

  Expected: stale client field names, old consumer relationship UI, and no visual Component view cause failures.

- [ ] **Step 3: Replace legacy child UI with backend-supported workflows.**

  Render all `component.apis` as provided APIs. Add an API creation dialog with exact `CreateAPIInput` fields. Replace the old Client dialog with its four current fields. Add a bind action only for `api_id === null`, with an API picker built from `bindingCandidates`. Remove `RelationshipDialog`, `relationshipCandidates`, and every old consumer relationship branch.

  Add a Component-level visual view, using the read-only canvas and `toGraphComponent(component)`. Keep Component security navigation and Product navigation intact. Wire `createComponentAPI`, `createComponentClient`, and `bindComponentClient` from context through `inventory-app.tsx`; close each dialog only after its mutation and refresh succeed.

- [ ] **Step 4: Run screen and route regression tests.**

  Run: `npm test -- components/inventory/inventory-app.test.tsx lib/routes.test.ts components/inventory/inventory-context.test.tsx`

  Expected: supported mutations refresh automatically, unavailable controls are absent, and existing Components / Architecture routes remain valid.

- [ ] **Step 5: Commit Component management.**

  ```bash
  git add components/inventory/component-pages.tsx components/inventory/inventory-app.tsx components/inventory/inventory-context.tsx components/inventory/inventory-app.test.tsx
  git commit -m "feat: manage component APIs and clients"
  ```

## Task 7: Run final validation, build the embedded UI, and deploy Compose

**Files:**
- Modify only if validation identifies an in-scope defect: files from Tasks 1–6.
- Read: `/Users/parkersec/go-projects/alpa/services/api-server/Dockerfile`
- Read: `/Users/parkersec/go-projects/alpa/docker-compose.yaml`

**Interfaces:**
- Consumes: the completed frontend build and the API server Dockerfile's `ui` stage.
- Produces: a rebuilt `api-server` Compose container containing the current frontend bundle.

- [ ] **Step 1: Run all frontend static and test checks.**

  Run:

  ```bash
  npm run typecheck
  npm run lint
  npm test
  npm run build
  ```

  Expected: all commands exit successfully; `dist/` is a fresh production Vite output.

- [ ] **Step 2: Review the final scope and diff.**

  Run:

  ```bash
  git diff --check HEAD~6..HEAD
  git status --short
  rg -n 'background-worker|BackgroundWorker|consumer-apis|client_type|api\.role|APIRole' lib components --glob '!*.test.tsx' --glob '!*.test.ts'
  ```

  Expected: no whitespace errors, no production legacy references, and only task-related modifications; preserve unrelated untracked files.

- [ ] **Step 3: Validate the Docker Compose configuration.**

  Run:

  ```bash
  docker compose -f /Users/parkersec/go-projects/alpa/docker-compose.yaml config
  ```

  Expected: a valid `postgres` and `api-server` configuration. The API server Dockerfile first builds `services/frontend`, copies its `dist` directory into `internal/webui/dist`, and compiles Go with `-tags=embedui`.

- [ ] **Step 4: Rebuild and deploy the API server with its embedded UI.**

  Run:

  ```bash
  docker compose -f /Users/parkersec/go-projects/alpa/docker-compose.yaml up --build --detach api-server
  docker compose -f /Users/parkersec/go-projects/alpa/docker-compose.yaml ps
  docker compose -f /Users/parkersec/go-projects/alpa/docker-compose.yaml logs --tail=100 api-server
  curl --fail --silent --show-error http://localhost:8080/docs/openapi.json > /dev/null
  curl --fail --silent --show-error http://localhost:8080/ > /dev/null
  ```

  Expected: `api-server` is running, OpenAPI is served, and the root UI is served from the rebuilt embedded bundle.

- [ ] **Step 5: Commit any validation fixes separately and report deployment state.**

  If a task-scoped fix was necessary:

  ```bash
  git add lib/inventory/graph-model.ts lib/inventory/architecture-graph.ts components/inventory/architecture-canvas.tsx components/inventory/component-pages.tsx components/inventory/inventory-app.test.tsx globals.css
  git commit -m "fix: validate inventory component preview"
  ```

  Report the exact frontend checks run, Docker Compose status, and any command that could not run with its cause.
