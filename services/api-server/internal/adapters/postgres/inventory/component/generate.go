// Package component persists inventory components in PostgreSQL.
package component

//go:generate go tool go-jsonschema --package component --struct-name-from-title --tags json --output details_models.gen.go schemas/backend_service/v1/schema.json schemas/frontend_service/v1/schema.json schemas/background_worker/v1/schema.json schemas/infrastructure/v1/schema.json
