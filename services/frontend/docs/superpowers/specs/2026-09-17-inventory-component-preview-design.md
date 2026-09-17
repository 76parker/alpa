# Inventory Component API Alignment and Graph Preview

## Purpose

Align the Inventory frontend with the current Inventory Backend API and use one
React Flow graph system for the product architecture, the Component creation
preview, and a Component's visual view. The graph is a client-side projection
of form data or fetched Component data; form changes never call the API.

## Scope and API boundary

The backend is the source of truth. The frontend will use only these current
routes:

| Capability | Route |
| --- | --- |
| Create a Component aggregate | `POST /v1/components` |
| Get or delete a Component | `GET` / `DELETE /v1/components/:id` |
| List a Product's Components | `GET /v1/products/:product_id/components` |
| Create an API | `POST /v1/components/:component_id/apis` |
| Create a Client | `POST /v1/components/:component_id/clients` |
| Bind a Client to an API | `POST /v1/components/:component_id/clients/:id/bindings` |

There are no routes for updating Components, APIs, or Clients; nor are there
subresource list routes. APIs and Clients are included in Component responses.
The frontend must not render unavailable edit or delete controls. It will
refresh `GET /v1/components/:id` after each supported mutation and replace the
matching Component in the existing inventory reducer.

## API contract

### Component aggregate

`POST /v1/components` creates the Component, zero to five APIs, and zero to
five Clients atomically. The request has `product_id`, `name`, `type`, and
`details`; `description`, `apis`, and `clients` are optional. Empty API and
Client collections will be omitted, not sent as `null`.

Component types are exactly `backend-service`, `frontend-service`, and
`infrastructure`. `BackgroundWorker` and `background-worker` are not part of
the contract and will have no frontend branches, labels, validation, or graph
fallbacks.

Service details require `language`; `language_version` and `framework` are
optional. Infrastructure details require `system` and `system_type`; `version`
is optional and `network_address` is optional on input. The backend normalizes
missing, `null`, or empty network addresses to `[]` in its response.

### APIs and Clients

An API consists of `name`, `api_type`, and `network_exposure`. The supported
API types include `event-consumer`; the obsolete frontend-only `event` value
will be removed. API responses no longer expose a `role`.

A Client consists of `client_name`, `role`, `communication_type`, and optional
`description`. Client responses include those four values, an `id`, and a
nullable `api_id`. `s3-client` is a valid client name and will be added to the
frontend options. The old `client_type` field will be removed.

Client role and communication choices will be limited to backend-valid
combinations: asynchronous broker clients use `producer` or `consumer` with
`events`; WebSocket and SSE use `listener` with `stream`; synchronous clients
use `caller` with a non-event communication type. Server validation remains
authoritative and is shown inline when a request is rejected.

An aggregate-created Client cannot be bound in the aggregate request, because
the creation DTO has no `api_id`. Binding is available after creation through
the dedicated Client binding route.

## Frontend contract and data flow

`lib/inventory/contracts.ts` remains the single TypeScript contract module and
will be changed to mirror the backend response and request DTOs. `clients` is
always an array on `Component`; `ComponentAPI.role`, legacy client types, and
consumer-API request types are removed.

`lib/inventory/client.ts` remains the sole hand-written API client. It gains
the supported API create and client bind calls, updates the client-create
payload, and removes the non-existent `consumer-apis` call. The existing
Inventory context/reducer remains the cache mechanism: a supported subresource
mutation is followed by `getComponent`, then by its existing replacement action.

## Shared graph system

The renderer must not receive React form state or raw API responses. A neutral
graph model will represent a Component, its APIs, and its Clients using stable
string identifiers, labels, type, details, and optional original Component ID.

Two adapters create that model:

1. A backend adapter maps a stored `Component` to the graph model.
2. A draft adapter maps the create form to the graph model. Each API and Client
   form row has a stable draft key, retained through edits and removals, so its
   node and handle identity does not shift with array indexes.

The graph builder consumes only that neutral model. It produces nodes and
edges, uses all component APIs as providers, and builds cross-component edges
solely from `client.api_id`. Its legacy branches for consumer APIs and missing
`clients` are removed.

The existing Architecture node markup, styling, handles, badges, tooltips, and
containers are moved behind a reusable React Flow canvas. It has two modes:

- **Product architecture:** preserves saved layouts, pointer and keyboard
  movement, open-Component actions, and the existing toolbar.
- **Read-only preview:** disables selection, connections, dragging, node-open
  actions, and layout persistence while retaining pan, zoom, controls, fit
  view, and the exact node presentation.

The existing product Architecture page remains under Components and retains
the Services / Infrastructure / Architecture control. No top-level navigation
is added.

## Creation workflow

The Create Component route becomes a desktop two-column layout: the form is
left and the read-only graph preview takes 40–50% of available width on the
right. At narrow widths it stacks vertically. A placeholder label such as
`Unnamed component` is used until a name is entered; it is display-only and is
never submitted.

The page maintains a single draft state for component data, APIs, and Clients.
Memoized adapters derive the preview from it immediately. Switching Component
type changes the same graph node/container presentation without remounting the
canvas or making a network request. Form values remain unless they become
inapplicable to the selected details type.

The form supports up to five APIs and five Clients with fields that exactly
match their creation DTOs. It validates required values and counts locally,
then sends one `POST /v1/components` request. On success, the response is added
to the inventory reducer and navigation opens the created Component. On error,
the populated form and preview remain visible with actionable inline feedback.

## Existing Component workflow

The Component page adds a separate visual view using the read-only shared
canvas and the fetched Component graph model. Its details and visual view
reflect the same reducer data, so an API, Client, or Client binding mutation is
visible immediately after the refresh.

The Component details expose the current APIs and Clients from the Component
response. Supported actions are:

- create an API;
- create a Client with backend-valid fields;
- bind an unbound Client to a selectable API.

No edit or delete action is presented until a corresponding backend route and
DTO exist.

## Error handling and accessibility

The existing request-error mapping and inline form errors are reused. Submit
buttons are disabled while their request is active. Every dynamic form row has
an explicit heading, labelled fields, and a labelled remove action. The preview
canvas exposes an accessible label, while decorative draft placeholders are not
announced as stored backend data.

## Verification

Tests will cover:

- exact client and aggregate request payloads, current enum values, and removed
  legacy routes;
- backend and draft graph adapters, stable draft identities, client binding
  edges, and removal of the legacy graph model;
- read-only canvas behavior and reuse of the same node type as Architecture;
- live Create preview changes for name, type, APIs, and Clients without fetches;
- one aggregate request on create, retained form values on a validation error,
  and responsive layout behavior;
- supported API, Client, and binding mutations updating the Component visual
  state without manual refresh;
- existing Components / Architecture navigation and current component views.

The existing type check, lint, test, and production build scripts will be run
after implementation.

## Out of scope

This change does not add dependencies, backend routes, generated clients,
frontend controls for unavailable update/delete operations, or a separate graph
node design.
