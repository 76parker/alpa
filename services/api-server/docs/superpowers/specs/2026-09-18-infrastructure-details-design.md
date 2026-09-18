# Infrastructure Details Design

## Goal

Replace the existing infrastructure-details v1 contract throughout the API with the agreed structure. The system has not been deployed, so this is intentionally a breaking replacement: existing v1 JSONB documents and the former HTTP field names are unsupported.

## Canonical v1 Contract

Infrastructure details use these fields at every boundary:

| Field | Type | Input behavior | Stored and returned behavior |
| --- | --- | --- | --- |
| `technology` | `InfrastructureTechnology` enum | Required | Required |
| `system_type` | `SystemType` enum | Required | Required |
| `version` | string | Optional | Omitted from JSONB when empty; returned as an empty string when absent |
| `endpoints` | string array | Optional; `null`, omitted, and `[]` mean no endpoints | Always stored and returned as an array; order and duplicates are retained |

The JSONB payload also contains the required `schema_version: 1`. The field names `system` and `network_address`, the `queue/stream` system type, and their associated errors are removed with no compatibility alias or migration.

`InfrastructureTechnology` permits the technologies already declared in `internal/domain/inventory/types.go`: PostgreSQL, MySQL, MariaDB, MongoDB, Cassandra, ClickHouse, Redis, Memcached, Etcd, Kafka, RabbitMQ, NATS, Pulsar, Elasticsearch, OpenSearch, S3, MinIO, Ceph, Temporal, Airflow, Argo Workflows, Nginx, Envoy, Kong, Traefik, HAProxy, Prometheus, Grafana, Zabbix, Jaeger, Zipkin, OpenTelemetry, Keycloak, and Vault.

`SystemType` permits: `message-broker`, `sql-database`, `nosql-database`, `cache`, `search-engine`, `object-storage`, `workflow-engine`, `service-mesh`, `api-gateway`, `load-balancer`, `identity-provider`, `secret-storage`, `monitoring`, `logging`, and `tracing`. Technology and system type are validated independently; this change does not add a technology-to-system-type compatibility matrix.

## Layer Responsibilities

- The domain owns both enum validations, copies endpoint slices, and enforces the maximum of ten endpoints.
- The application command and domain mapping carry `Technology` and `Endpoints` without translating field names.
- The HTTP request and response types expose `technology` and `endpoints`, normalize their strings, and map directly to the application command and domain response.
- PostgreSQL JSONB schemas, generated models, and the codec persist and restore the same four fields under `schema_version: 1`.
- OpenAPI YAML and JSON document the fields, enum values, optional input semantics, output shape, and error codes.

## Errors

Unknown technology returns the domain error `ErrUnknownInfrastructureTechnology`, which maps to the HTTP error code `unknown_infrastructure_technology`. An unknown `system_type` continues to return `unknown_system_type`. More than ten endpoints returns `ErrTooManyEndpoints`, mapped to `too_many_endpoints`.

## Verification

The implementation updates the existing infrastructure e2e scenario before production code. It verifies normalization, all supported system-type categories, invalid technology and system type rejection, endpoint-limit rejection, JSONB storage, and HTTP round trips using the new field names. Generated PostgreSQL models are regenerated from the edited schema. The complete Go test suite, OpenAPI embed tests, formatting, and diff checks are run after the change.

## Out of Scope

- Reading or transforming legacy `system` / `network_address` payloads.
- A schema-version bump or data migration.
- Enforcing pairs between individual technologies and system types.
