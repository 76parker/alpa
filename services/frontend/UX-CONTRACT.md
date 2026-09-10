# Alpa UX contract

## Scope and accessibility

- Audience: application-security teams maintaining product, component, API relationship, and architecture-map records. Threat modeling and security-check routes are explicitly in development.
- Locale: English (`en`) with current Russian strings retained as model content only.
- Accessibility target: WCAG 2.2 AA intent, with native semantics, visible focus, labelled controls, keyboard operation, and status announcements.
- Design source: [DESIGN.md](DESIGN.md); runtime tokens live in `globals.css`.

## Canonical URLs and titles

The client parses and serializes the following canonical paths. Navigation uses History API entries; browser Back/Forward restores the corresponding workspace. Unknown paths fall back to Dashboard.

| Surface | URL |
|---|---|
| Dashboard | `/` |
| Workspace | `/workspaces` |
| Products / create | `/products`, `/products/new` |
| Product | `/products/:productKey`, `/products/:productKey/architecture`, `/products/:productKey/threat-model` |
| Component | `/products/:productKey/components/:componentId`, `/products/:productKey/components/:componentId/security`, `/products/:productKey/components/:componentId/security/:checkType` |
| Templates | `/templates` |
| Teams | `/teams`, `/teams/:teamId` |
| Settings | `/settings` |

Every route sets `"<surface> · Alpa"` as its document title. The Go server serves the SPA entry point for HTML navigation, preserving direct opening and refresh of nested routes.

## Search and tables

Search is local and immediate in this prototype. Every search field uses the shared `SearchField`: a real label, search glyph, keyboard-accessible clear action, immediate clear, and focus restoration to the input. Catalog/table results show a stable count and an explicit empty/no-results message. The Products table remains semantic and avoids horizontal scrolling on narrow viewports by hiding the secondary name column; a present description renders only as prominent `...`, with the full value in an application-owned tooltip on hover or keyboard focus. An absent description is `—`.

## Forms, overlays, and feedback

Forms use labelled native fields and application-owned validation messaging; creation fields use the shared `FieldLabel` pattern with an aligned required marker and a circled, keyboard-focusable `?` that reveals a body-portalled, viewport-clamped help tooltip on hover or focus and closes it on blur, pointer leave, or Escape without moving keyboard focus. Product forms use `noValidate`, inline field errors, and first-error focus. Native `<select>` popups are an intentional platform-owned choice for this prototype. Password/secret fields are masked by default if introduced. Textareas do not resize manually. Modal dialogs and drawers are app-owned surfaces with explicit close controls, Escape dismissal, focus restoration, and isolated backgrounds; browser alert/confirm/prompt are not used. Toasts use `role="status"`, dismiss automatically after 3.2 seconds, and can be dismissed manually.

Workspace is a first-class sidebar destination at `/workspaces`; the switcher opens a labelled inline sidebar disclosure rather than a chooser dialog. The bounded workspace list scrolls internally, while disclosure expansion moves the primary navigation down in normal flow. Activating the trigger again, Escape, or an outside pointer action closes the list; Escape restores focus to the trigger. Selecting a workspace closes the disclosure, clears product and component selection, navigates to `/products`, and prevents responses from a previously selected workspace from replacing current data. The list’s Create workspace action opens the app-owned creation dialog. Creating a workspace selects it immediately and opens its empty Products view. The top-bar path shows the entity type above its name; every preceding segment is a keyboard-accessible return control, while the current entity remains a non-interactive marker. Component API panels are titled `APIs this component provides` and `APIs this component uses`; each includes a keyboard-accessible shared help control that explains its direction.

## Navigation and create/edit outcomes

Create Product returns to Products and announces `Product created` only after the server confirms creation; the new row uses the table's standard resting state. Creating a component closes its modal and navigates to the server-created component summary. Adding an API relationship offers only unlinked provider APIs from other components in the current product. A relationship is announced only after the POST and component refetch confirm it; duplicate `409` responses remain inline in the open dialog, while an unknown mutation result is refreshed before another attempt is allowed. Cancel and Back return to the owning list/workspace.

Dashboard, Templates, Teams, Settings, threat-modeling, and security-check URLs remain canonical route-backed screens. They show the shared in-development notice, set the route-specific document title, perform no local mutations, and return to the owning surface. Dashboard’s Back action returns to Products. The architecture-map URL is a read-only React Flow view built from the current product component response: each component is a node, consumer-to-provider API relationships are directed edges, provider API types are compact badges, and node positions are session-only. The previous editable template and topology surfaces are not exposed from inventory routes.

## Persistence and resilience

Workspaces, Products, Components, and API relationships come from the inventory API directly through same-origin `/v1/...` endpoints. Inventory entities are never copied into browser storage. Only the active workspace ID is persisted under the compatibility key `appsec-atlas-active-workspace-v1`; retaining the pre-Alpa key prevents a brand-only update from discarding an existing user choice. A valid persisted choice wins, otherwise the API workspace named exactly `default` is selected, with the first returned workspace as the final fallback. All list endpoints are exhausted in pages of 100, while Products search is local and exact to the returned values and the visible table paginates by 20.

The Go service serves both UI and API at `http://localhost:8080` by default. Production embeds the Vite build in the Go binary. In local development Vite rebuilds files with `vite build --watch`, Go reads those files from `http.ui_assets_dir`, and the user refreshes the page manually. There is no frontend HTTP server, proxy, or CORS layer.

Moving from port 3000 to port 8080 changes the browser origin. localStorage is not transferred between origins; active workspace selection follows the existing fallback rule. PostgreSQL data is unaffected.

Dashboard is temporarily an in-development surface. It makes no inventory-specific requests beyond the application’s normal workspace/product hydration, introduces no demo entities or local persistence, and returns to Products through its Back action. Teams and Settings remain route-backed in-development notices until their inventory-backed implementations are available.
