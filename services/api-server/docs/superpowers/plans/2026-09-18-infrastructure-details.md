# Infrastructure Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Infrastructure Details v1 with the `technology`, `system_type`, `version`, and `endpoints` contract across every API layer and its documentation.

**Architecture:** The domain validates the two enum types and endpoint limit. HTTP and JSONB transport use the same field names, while the PostgreSQL schema generates the persistence model used by the codec. OpenAPI mirrors the public HTTP contract and error codes.

**Tech Stack:** Go, Gin, PostgreSQL JSONB, go-jsonschema, OpenAPI 3.0, Testify/testo.

**Spec:** `docs/superpowers/specs/2026-09-18-infrastructure-details-design.md`

## Global Constraints

- This is a breaking v1 replacement: reject and do not migrate legacy `system`, `network_address`, or `queue/stream` values.
- `technology` and `system_type` are required enum values; `version` and `endpoints` are optional on input.
- Omitted, `null`, or empty `endpoints` persist and return as `[]`; preserve endpoint order and duplicates.
- JSONB retains `schema_version: 1`; no schema-version bump or compatibility decoder is added.
- Validate technologies and system types independently; do not introduce a technology-to-system-type matrix.
- Rename the public endpoint-limit error to `too_many_endpoints` and add `unknown_infrastructure_technology`.

---

### Task 1: Establish domain behavior with a failing test

**Files:**
- Create: `internal/domain/inventory/component_details_test.go`
- Modify: `internal/domain/inventory/component.go`
- Modify: `internal/domain/inventory/component_details.go`
- Modify: `internal/applications/inventory/component/commands.go`
- Modify: `internal/applications/inventory/component/service.go`

**Interfaces:**
- Consumes: `InfrastructureTechnology`, `SystemType`, and their constants from `internal/domain/inventory/types.go`.
- Produces: `NewInfrastructureComponentDetails(technology InfrastructureTechnology, systemType SystemType, version string, endpoints []string) (InfrastructureComponentDetails, error)`, `ErrUnknownInfrastructureTechnology`, and `ErrTooManyEndpoints`.

- [x] **Step 1: Write the failing domain scenarios**

```go
func TestNewInfrastructureComponentDetails(t *testing.T) {
	t.Parallel()

	validTechnology := []InfrastructureTechnology{
		InfrastructureTechnologyPostgreSQL, InfrastructureTechnologyMySQL,
		InfrastructureTechnologyMariaDB, InfrastructureTechnologyMongoDB,
		InfrastructureTechnologyCassandra, InfrastructureTechnologyClickHouse,
		InfrastructureTechnologyRedis, InfrastructureTechnologyMemcached,
		InfrastructureTechnologyEtcd, InfrastructureTechnologyKafka,
		InfrastructureTechnologyRabbitMQ, InfrastructureTechnologyNATS,
		InfrastructureTechnologyPulsar, InfrastructureTechnologyElasticsearch,
		InfrastructureTechnologyOpenSearch, InfrastructureTechnologyS3,
		InfrastructureTechnologyMinIO, InfrastructureTechnologyCeph,
		InfrastructureTechnologyTemporal, InfrastructureTechnologyAirflow,
		InfrastructureTechnologyArgo, InfrastructureTechnologyNginx,
		InfrastructureTechnologyEnvoy, InfrastructureTechnologyKong,
		InfrastructureTechnologyTraefik, InfrastructureTechnologyHAProxy,
		InfrastructureTechnologyPrometheus, InfrastructureTechnologyGrafana,
		InfrastructureTechnologyZabbix, InfrastructureTechnologyJaeger,
		InfrastructureTechnologyZipkin, InfrastructureTechnologyOpenTelemetry,
		InfrastructureTechnologyKeycloak, InfrastructureTechnologyVault,
	}
	for _, technology := range validTechnology {
		t.Run("valid technology/"+string(technology), func(t *testing.T) {
			details, err := NewInfrastructureComponentDetails(technology, SystemTypeSQLDatabase, "17", []string{"primary:5432"})
			require.NoError(t, err)
			assert.Equal(t, []string{"primary:5432"}, details.Endpoints)
		})
	}

	for _, systemType := range []SystemType{
		SystemTypeMessageBroker, SystemTypeSQLDatabase, SystemTypeNoSQLDatabase,
		SystemTypeCache, SystemTypeSearchEngine, SystemTypeObjectStorage,
		SystemTypeWorkflowEngine, SystemTypeServiceMesh, SystemTypeAPIGateway,
		SystemTypeLoadBalancer, SystemTypeIdentityProvider, SystemTypeSecretStorage,
		SystemTypeMonitoring, SystemTypeLogging, SystemTypeTracing,
	} {
		t.Run("valid system type/"+string(systemType), func(t *testing.T) {
			_, err := NewInfrastructureComponentDetails(InfrastructureTechnologyPostgreSQL, systemType, "", nil)
			require.NoError(t, err)
		})
	}

	_, err := NewInfrastructureComponentDetails("postgres", SystemTypeSQLDatabase, "", nil)
	assert.ErrorIs(t, err, ErrUnknownInfrastructureTechnology)
	_, err = NewInfrastructureComponentDetails(InfrastructureTechnologyPostgreSQL, "queue/stream", "", nil)
	assert.ErrorIs(t, err, ErrUnknownSystemType)
	_, err = NewInfrastructureComponentDetails(InfrastructureTechnologyPostgreSQL, SystemTypeSQLDatabase, "", make([]string, 11))
	assert.ErrorIs(t, err, ErrTooManyEndpoints)
}
```

- [x] **Step 2: Run the new test to verify RED**

Run: `go test ./internal/domain/inventory -run TestNewInfrastructureComponentDetails -count=1`

Expected: compilation fails because `ErrUnknownInfrastructureTechnology` and `ErrTooManyEndpoints` do not exist; this proves the new validation contract is not yet implemented.

- [x] **Step 3: Implement the domain contract**

In `component.go`, replace `ErrTooManyNetworkAddresses` with `ErrTooManyEndpoints` and add `ErrUnknownInfrastructureTechnology`.

In `component_details.go`, rename the constructor's final parameter and copied local slice to `endpoints`, validate `Technology` with `isValidInfrastructureTechnology`, validate all declared system types, and return the renamed errors:

```go
func (d InfrastructureComponentDetails) validate() error {
	if !isValidInfrastructureTechnology(d.Technology) {
		return ErrUnknownInfrastructureTechnology
	}
	if !isValidSystemType(d.SystemType) {
		return ErrUnknownSystemType
	}
	if len(d.Endpoints) > 10 {
		return ErrTooManyEndpoints
	}
	return nil
}
```

Implement both helpers as exhaustive `switch` statements over the constants in `types.go`; the technology helper contains all 34 `InfrastructureTechnology*` constants and the system-type helper contains all 15 `SystemType*` constants listed in Task 1.

- [x] **Step 4: Complete the application-layer mapping**

Ensure the application command and its conversion to the domain use the new names without any remaining translation to the legacy terms:

```go
type InfrastructureDetails struct {
	Technology inventory.InfrastructureTechnology
	Version    string
	SystemType inventory.SystemType
	Endpoints  []string
}

return inventory.NewInfrastructureComponentDetails(
	details.Technology,
	details.SystemType,
	details.Version,
	details.Endpoints,
)
```

- [x] **Step 5: Run the domain test to verify GREEN**

Run: `go test ./internal/domain/inventory -run TestNewInfrastructureComponentDetails -count=1`

Expected: PASS. The test must prove that every declared enum value is accepted, both invalid values receive their dedicated errors, and the endpoint limit remains ten.

- [x] **Step 6: Format the changed domain and application files**

Run: `gofmt -w internal/domain/inventory/component.go internal/domain/inventory/component_details.go internal/domain/inventory/component_details_test.go internal/applications/inventory/component/commands.go internal/applications/inventory/component/service.go`

### Task 2: Update JSONB schema and codec through a failing round-trip test

**Files:**
- Create: `internal/adapters/postgres/inventory/component/details_codec_test.go`
- Modify: `internal/adapters/postgres/inventory/component/schemas/infrastructure/v1/schema.json`
- Modify: `internal/adapters/postgres/inventory/component/schemas/infrastructure/v1/example.json`
- Modify: `internal/adapters/postgres/inventory/component/details_models.gen.go` (generated)
- Modify: `internal/adapters/postgres/inventory/component/details_codec.go`

**Interfaces:**
- Consumes: the domain constructor and the generated `InfrastructureDetailsV1` model.
- Produces: JSONB with `schema_version`, `technology`, `system_type`, optional `version`, and `endpoints`.

- [x] **Step 1: Write the failing persistence round-trip test**

```go
func TestInfrastructureDetailsCodecRoundTrip(t *testing.T) {
	t.Parallel()

	details, err := inventory.NewInfrastructureComponentDetails(
		inventory.InfrastructureTechnologyPostgreSQL,
		inventory.SystemTypeSQLDatabase,
		"17",
		[]string{"primary:5432", "replica:5432", "replica:5432"},
	)
	require.NoError(t, err)

	encoded, err := Encode(details)
	require.NoError(t, err)
	assert.JSONEq(t, `{"schema_version":1,"technology":"postgresql","version":"17","system_type":"sql-database","endpoints":["primary:5432","replica:5432","replica:5432"]}`, string(encoded))

	decoded, err := Decode(inventory.ComponentTypeInfrastructure, encoded)
	require.NoError(t, err)
	assert.Equal(t, details, decoded)
}
```

- [x] **Step 2: Run the codec test to verify RED**

Run: `go test ./internal/adapters/postgres/inventory/component -run TestInfrastructureDetailsCodecRoundTrip -count=1`

Expected: FAIL to build because the generated model and codec still expose `System` and `NetworkAddress`.

- [x] **Step 3: Replace the JSONB schema and regenerate the model**

Edit `schemas/infrastructure/v1/schema.json` so its required fields are `schema_version`, `technology`, `system_type`, and `endpoints`; replace the old property names; and make the technology and system-type enum lists match `types.go`. Update `example.json` to use `technology: "postgresql"` and `endpoints`.

Run: `go generate ./internal/adapters/postgres/inventory/component`

The generated `InfrastructureDetailsV1` must expose `Technology`, `SystemType`, `Version`, and `Endpoints` with the corresponding JSON tags and enum aliases.

- [x] **Step 4: Implement the codec mapping**

```go
payload = InfrastructureDetailsV1{
	SchemaVersion: schemaVersion,
	Technology:    InfrastructureDetailsV1Technology(typed.Technology),
	Version:       stringPointer(typed.Version),
	SystemType:    InfrastructureDetailsV1SystemType(typed.SystemType),
	Endpoints:     append([]string{}, typed.Endpoints...),
}

details, err := inventory.NewInfrastructureComponentDetails(
	inventory.InfrastructureTechnology(payload.Technology),
	inventory.SystemType(payload.SystemType),
	stringValue(payload.Version),
	payload.Endpoints,
)
```

- [x] **Step 5: Run the codec test to verify GREEN and format it**

Run: `gofmt -w internal/adapters/postgres/inventory/component/details_codec.go internal/adapters/postgres/inventory/component/details_codec_test.go && go test ./internal/adapters/postgres/inventory/component -run TestInfrastructureDetailsCodecRoundTrip -count=1`

Expected: PASS. The encoded JSON uses only the new names and decoding restores the precise domain value.

### Task 3: Migrate the HTTP contract and error mapping through the e2e scenario

**Files:**
- Modify: `internal/httpapi/component/v1_requests.go`
- Modify: `internal/httpapi/component/v1_responses.go`
- Modify: `internal/httpapi/errmap/errmap.go`
- Modify: `tests/e2e/component_test.go`

**Interfaces:**
- Consumes: `appcomponent.InfrastructureDetails{Technology, Version, SystemType, Endpoints}` and the domain errors from Task 1.
- Produces: request and response JSON containing `technology`, `system_type`, `version`, and `endpoints`; HTTP error codes `unknown_infrastructure_technology` and `too_many_endpoints`.

- [x] **Step 1: Change the existing e2e scenario to the new public contract**

Rename the scenario to `InfrastructureTechnologiesTypesAndEndpoints`. Build each details payload with `technology` and `endpoints`; change expected stored and returned JSON fields to the same names. Preserve the assertions for trimming, null/omitted/empty endpoint arrays, order, duplicates, rejected scalar endpoint JSON, and no persistence after rejected requests.

Add valid cases for every system type in the specification, use `" message-broker "` instead of `queue/stream`, add an invalid `technology: "postgres"` case expecting `unknown_infrastructure_technology`, and change the eleven-item case to expect `too_many_endpoints`.

- [x] **Step 2: Run the e2e scenario to verify RED**

Run: `go test ./tests/e2e -run '^TestComponentE2E/InfrastructureTechnologiesTypesAndEndpoints$' -count=1`

Expected: FAIL because HTTP request and response structures still use the removed public field names.

- [x] **Step 3: Implement request, response, and error mappings**

Replace the HTTP request fields and tags with:

```go
Technology inventory.InfrastructureTechnology `json:"technology" validate:"max=50,allowed_text"`
Version    *string                            `json:"version,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
SystemType inventory.SystemType               `json:"system_type" validate:"max=50,allowed_text"`
Endpoints  []string                           `json:"endpoints,omitempty" validate:"dive,min=1,max=50,allowed_text"`
```

Normalize `Technology` and each endpoint, map those fields to the application command, and rename the response fields and JSON tags to `Technology` / `technology` and `Endpoints` / `endpoints`.

In `errmap.go`, replace `CodeTooManyNetworkAddresses` with `CodeTooManyEndpoints`, add `CodeUnknownInfrastructureTechnology`, and map the two corresponding domain errors to clear 400 responses.

- [x] **Step 4: Run the e2e scenario to verify GREEN**

Run: `go test ./tests/e2e -run '^TestComponentE2E/InfrastructureTechnologiesTypesAndEndpoints$' -count=1`

Expected: PASS. The scenario exercises the HTTP-to-JSONB-to-HTTP round trip and all public errors.

- [x] **Step 5: Format the HTTP changes**

Run: `gofmt -w internal/httpapi/component/v1_requests.go internal/httpapi/component/v1_responses.go internal/httpapi/errmap/errmap.go tests/e2e/component_test.go`

### Task 4: Publish the OpenAPI contract and keep both documents equivalent

**Files:**
- Modify: `docs/openapi.yaml`
- Modify: `docs/openapi.json`
- Modify: `internal/httpapi/component/v1/create-request.schema.json`
- Modify: `internal/httpapi/component/v1/create-response.schema.json`
- Modify: `internal/httpapi/component/v1/get-response.schema.json`
- Modify: `internal/httpapi/component/v1/list-response.schema.json`
- Modify: `internal/httpapi/component/v1/examples/create-component-examples.json`
- Test: `docs/embed_test.go`

**Interfaces:**
- Consumes: the HTTP field names, enum sets, optional-input rules, and error codes implemented in Task 3.
- Produces: equivalent YAML and JSON OpenAPI documents served by the embedded documentation package.

- [x] **Step 1: Update the YAML source contract**

Add an `InfrastructureTechnology` string enum containing the values from the specification. Expand `SystemType` to all 15 values. In `InfrastructureDetails` and `InfrastructureDetailsRequest`, replace `system` with required `technology` referencing the new enum and replace `network_address` with `endpoints`; retain the documented array semantics and use technology/endpoint examples. Replace old error-code terms in the create-component endpoint description.

- [x] **Step 2: Run the documentation equivalence test to verify RED**

Run: `go test ./docs -run TestOpenAPIDocumentsAreValidAndEquivalent -count=1`

Expected: FAIL with `OpenAPI YAML and JSON differ`, proving the served JSON contract has not yet been updated.

- [x] **Step 3: Mirror the YAML contract in JSON**

Apply the identical schemas, enum values, examples, required lists, and error-code wording in `docs/openapi.json`. Do not retain legacy property names or enum values.

- [x] **Step 4: Run the documentation test to verify GREEN**

Run: `go test ./docs -run TestOpenAPIDocumentsAreValidAndEquivalent -count=1`

Expected: PASS. Both embedded documents parse and normalize to the same API contract.

- [x] **Step 5: Update local HTTP JSON-schema artifacts and examples**

In all four `internal/httpapi/component/v1/*response.schema.json` files, replace Infrastructure Details fields with `technology` and `endpoints`, expand both enum lists to the values in the specification, and retain the response requirement that endpoints is an array. In `create-request.schema.json`, apply the same field names and enum lists while allowing `endpoints: null` on input. Update the infrastructure example to use `technology: "postgresql"` and `endpoints`.

- [x] **Step 6: Validate local JSON-schema syntax**

Run: `jq empty internal/httpapi/component/v1/create-request.schema.json internal/httpapi/component/v1/create-response.schema.json internal/httpapi/component/v1/get-response.schema.json internal/httpapi/component/v1/list-response.schema.json internal/httpapi/component/v1/examples/create-component-examples.json`

Expected: PASS with no output.

### Task 5: Verify the complete change and commit only task-owned files

**Files:**
- Modify: all files from Tasks 1-4

**Interfaces:**
- Consumes: the complete implementation and documentation contract.
- Produces: a formatted, compiling API server with its test suite and public documentation in agreement.

- [x] **Step 1: Check compiler diagnostics for edited Go files**

Run the gopls/Serena diagnostics operation for each edited Go file and resolve every diagnostic.

- [x] **Step 2: Run focused package tests**

Run: `go test ./internal/domain/inventory ./internal/adapters/postgres/inventory/component ./internal/httpapi/component ./internal/httpapi/errmap ./docs -count=1`

Expected: PASS.

- [x] **Step 3: Run repository-wide verification**

Run: `go test ./... -count=1 && git diff --check`

Expected: PASS with no whitespace errors.

- [x] **Step 4: Inspect the final migration sweep**

Run: `grep -RInE 'network_address|"system"|queue/stream|TooManyNetworkAddresses' internal/adapters/postgres/inventory/component internal/httpapi docs/openapi.yaml docs/openapi.json || true`

Expected: no legacy Infrastructure Details contract references remain in production code or served OpenAPI documents. Tests may retain a legacy value only to verify rejection.

- [x] **Step 5: Commit task-owned files**

Stage only the implementation, tests, OpenAPI documents, generated model, design, and plan files belonging to this Infrastructure Details migration. Do not stage unrelated modified files such as the transaction manager, product API, bootstrap test, or frontend files. Commit with: `feat(inventory): replace infrastructure details contract`.
