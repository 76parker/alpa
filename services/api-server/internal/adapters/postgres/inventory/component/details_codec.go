package component

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/76parker/alpa/internal/domain/inventory"
)

var (
	errInvalidDetails     = errors.New("invalid component details")
	errUnsupportedVersion = errors.New("unsupported component details version")
)

const schemaVersion = 1

type header struct {
	SchemaVersion *int `json:"schema_version"`
}

func Encode(details inventory.ComponentDetails) (json.RawMessage, error) {
	var payload any

	switch typed := details.(type) {
	case inventory.BackendServiceComponentDetails:
		payload = BackendServiceDetailsV1{
			SchemaVersion: schemaVersion,
			CoreLanguage:  BackendServiceDetailsV1CoreLanguage(typed.Language),
			RepositoryUrl: typed.RepositoryURL,
		}
	case inventory.FrontendServiceComponentDetails:
		payload = FrontendServiceDetailsV1{
			SchemaVersion:   schemaVersion,
			CoreLanguage:    FrontendServiceDetailsV1CoreLanguage(typed.Language),
			LanguageVersion: stringPointer(typed.LanguageVersion),
			MainFramework:   stringPointer(typed.MainFramework),
		}
	case inventory.InfrastructureComponentDetails:
		payload = InfrastructureDetailsV1{
			Endpoints:      append([]string{}, typed.Endpoints...),
			SchemaVersion:  schemaVersion,
			TechnologyName: InfrastructureDetailsV1TechnologyName(typed.TechnologyName),
			TechnologyType: InfrastructureDetailsV1TechnologyType(typed.TechnologyType),
			Importancy:     InfrastructureDetailsV1Importancy(typed.Importancy),
			Version:        stringPointer(typed.Version),
		}
	default:
		return nil, fmt.Errorf("%w: unsupported type %T", errInvalidDetails, details)
	}

	encoded, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("%w: marshal payload: %w", errInvalidDetails, err)
	}

	return json.RawMessage(encoded), nil
}

func Decode(
	componentType inventory.ComponentType,
	raw json.RawMessage,
) (inventory.ComponentDetails, error) {
	var value header
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, fmt.Errorf("%w: decode header: %w", errInvalidDetails, err)
	}
	if value.SchemaVersion == nil {
		return nil, fmt.Errorf("%w: schema_version is required", errInvalidDetails)
	}
	if *value.SchemaVersion != schemaVersion {
		return nil, fmt.Errorf(
			"%w: component type %q version %d",
			errUnsupportedVersion,
			componentType,
			*value.SchemaVersion,
		)
	}

	switch componentType {
	case inventory.Backend:
		var payload BackendServiceDetailsV1
		if err := json.Unmarshal(raw, &payload); err != nil {
			return nil, fmt.Errorf("%w: decode backend service v1: %w", errInvalidDetails, err)
		}
		language, err := inventory.NewLanguage(string(payload.CoreLanguage))
		if err != nil {
			return nil, fmt.Errorf("%w: restore backend service language: %w", errInvalidDetails, err)
		}
		details, err := inventory.NewBackendServiceComponentDetails(
			language,
			payload.RepositoryUrl,
		)
		if err != nil {
			return nil, fmt.Errorf("%w: restore backend service v1: %w", errInvalidDetails, err)
		}
		return details, nil
	case inventory.Frontend:
		var payload FrontendServiceDetailsV1
		if err := json.Unmarshal(raw, &payload); err != nil {
			return nil, fmt.Errorf("%w: decode frontend service v1: %w", errInvalidDetails, err)
		}
		language, err := inventory.NewLanguage(string(payload.CoreLanguage))
		if err != nil {
			return nil, fmt.Errorf("%w: restore frontend service language: %w", errInvalidDetails, err)
		}
		details, err := inventory.NewFrontendServiceComponentDetails(
			language,
			stringValue(payload.LanguageVersion),
			stringValue(payload.MainFramework),
		)
		if err != nil {
			return nil, fmt.Errorf("%w: restore frontend service v1: %w", errInvalidDetails, err)
		}
		return details, nil
	case inventory.Infrastructure:
		var payload InfrastructureDetailsV1
		if err := json.Unmarshal(raw, &payload); err != nil {
			return nil, fmt.Errorf("%w: decode infrastructure v1: %w", errInvalidDetails, err)
		}
		details, err := inventory.NewInfrastructureComponentDetails(
			inventory.TechnologyName(payload.TechnologyName),
			inventory.TechnologyType(payload.TechnologyType),
			inventory.InfrastructureCriticality(payload.Importancy),
			stringValue(payload.Version),
			payload.Endpoints,
		)
		if err != nil {
			return nil, fmt.Errorf("%w: restore infrastructure v1: %w", errInvalidDetails, err)
		}
		return details, nil
	default:
		return nil, fmt.Errorf("%w: unknown component type %q", errInvalidDetails, componentType)
	}
}

func stringPointer(value string) *string {
	if value == "" {
		return nil
	}

	return &value
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}

	return *value
}
