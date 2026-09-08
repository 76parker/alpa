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
			SchemaVersion:   schemaVersion,
			CoreLanguage:    typed.Language,
			LanguageVersion: stringPointer(typed.LanguageVersion),
			MainFramework:   stringPointer(typed.MainFramework),
		}
	case inventory.FrontendServiceComponentDetails:
		payload = FrontendServiceDetailsV1{
			SchemaVersion:   schemaVersion,
			CoreLanguage:    typed.Language,
			LanguageVersion: stringPointer(typed.LanguageVersion),
			MainFramework:   stringPointer(typed.MainFramework),
		}
	case inventory.BackgroundWorkerComponentDetails:
		payload = BackgroundWorkerDetailsV1{
			SchemaVersion:   schemaVersion,
			CoreLanguage:    typed.Language,
			LanguageVersion: stringPointer(typed.LanguageVersion),
			MainFramework:   stringPointer(typed.MainFramework),
			Broker:          BackgroundWorkerDetailsV1Broker(typed.Broker),
		}
	case inventory.InfrastructureComponentDetails:
		payload = InfrastructureDetailsV1{
			SchemaVersion:  schemaVersion,
			System:         typed.System,
			Version:        stringPointer(typed.Version),
			NetworkAddress: stringPointer(typed.NetworkAddress),
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
	case inventory.ComponentTypeBackend:
		var payload BackendServiceDetailsV1
		if err := json.Unmarshal(raw, &payload); err != nil {
			return nil, fmt.Errorf("%w: decode backend service v1: %w", errInvalidDetails, err)
		}
		details, err := inventory.NewBackendServiceComponentDetails(
			payload.CoreLanguage,
			stringValue(payload.LanguageVersion),
			stringValue(payload.MainFramework),
		)
		if err != nil {
			return nil, fmt.Errorf("%w: restore backend service v1: %w", errInvalidDetails, err)
		}
		return details, nil
	case inventory.ComponentTypeFrontend:
		var payload FrontendServiceDetailsV1
		if err := json.Unmarshal(raw, &payload); err != nil {
			return nil, fmt.Errorf("%w: decode frontend service v1: %w", errInvalidDetails, err)
		}
		details, err := inventory.NewFrontendServiceComponentDetails(
			payload.CoreLanguage,
			stringValue(payload.LanguageVersion),
			stringValue(payload.MainFramework),
		)
		if err != nil {
			return nil, fmt.Errorf("%w: restore frontend service v1: %w", errInvalidDetails, err)
		}
		return details, nil
	case inventory.ComponentTypeBackgroundWorker:
		var payload BackgroundWorkerDetailsV1
		if err := json.Unmarshal(raw, &payload); err != nil {
			return nil, fmt.Errorf("%w: decode background worker v1: %w", errInvalidDetails, err)
		}
		details, err := inventory.NewBackgroundWorkerComponentDetails(
			payload.CoreLanguage,
			stringValue(payload.LanguageVersion),
			stringValue(payload.MainFramework),
			inventory.EventBrokerType(payload.Broker),
		)
		if err != nil {
			return nil, fmt.Errorf("%w: restore background worker v1: %w", errInvalidDetails, err)
		}
		return details, nil
	case inventory.ComponentTypeInfrastructure:
		var payload InfrastructureDetailsV1
		if err := json.Unmarshal(raw, &payload); err != nil {
			return nil, fmt.Errorf("%w: decode infrastructure v1: %w", errInvalidDetails, err)
		}
		details, err := inventory.NewInfrastructureComponentDetails(
			payload.System,
			stringValue(payload.Version),
			stringValue(payload.NetworkAddress),
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
