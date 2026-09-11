package component

import (
	"encoding/json"
	"fmt"

	appcomponent "github.com/76parker/alpa/internal/applications/inventory/component"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/go-playground/validator/v10"
)

type CreateRequestV1 struct {
	ProductID   int64                   `json:"product_id" validate:"gt=0"`
	Name        string                  `json:"name" validate:"required,max=50,allowed_text"`
	Type        inventory.ComponentType `json:"type" validate:"required,oneof='backend-service' 'frontend-service' infrastructure 'background-worker'"`
	Description *string                 `json:"description,omitempty" validate:"omitempty,min=1,max=1000,allowed_text"`
	Details     json.RawMessage         `json:"details" validate:"required"`
	APIs        []APIRequestV1          `json:"apis,omitempty" validate:"dive"`
}

type ConsumerAPICreateRequestV1 struct {
	APIID int64 `json:"api_id" validate:"gt=0"`
}

type APIRequestV1 struct {
	Name            string                    `json:"name" validate:"required,max=50,allowed_text"`
	APIType         inventory.APIType         `json:"api_type" validate:"required,oneof=rest graphql grpc json-rpc soap websocket odata sse event 'native-protocol'"`
	NetworkExposure inventory.NetworkExposure `json:"network_exposure" validate:"required,oneof=internal internet"`
}

type ServiceDetailsV1 struct {
	Language        string  `json:"language" validate:"required,max=50,allowed_text"`
	LanguageVersion *string `json:"language_version,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
	Framework       *string `json:"framework,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
}

type BackgroundWorkerDetailsV1 struct {
	Language        string                    `json:"language" validate:"required,max=50,allowed_text"`
	LanguageVersion *string                   `json:"language_version,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
	Framework       *string                   `json:"framework,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
	Broker          inventory.EventBrokerType `json:"broker" validate:"required,oneof=rabbitmq kafka redpanda nats-jetstream 'apache-pulsar' 'aws-sqs' 'google-cloud-pub-sub' 'azure-service-bus' 'redis-streams' activemq 'ibm-mq'"`
}

type InfrastructureDetailsV1 struct {
	System         string  `json:"system" validate:"required,max=50,allowed_text"`
	Version        *string `json:"version,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
	NetworkAddress *string `json:"network_address,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
}

func decodeDetails(
	componentType inventory.ComponentType,
	raw json.RawMessage,
	validate *validator.Validate,
) (appcomponent.Details, error) {
	switch componentType {
	case inventory.ComponentTypeBackend:
		details, err := httputil.DecodeAndValidateJSONBytes[ServiceDetailsV1](raw, validate)
		if err != nil {
			return nil, err
		}
		return appcomponent.BackendServiceDetails{CoreLanguage: details.Language, LanguageVersion: stringValue(details.LanguageVersion), MainFramework: stringValue(details.Framework)}, nil
	case inventory.ComponentTypeFrontend:
		details, err := httputil.DecodeAndValidateJSONBytes[ServiceDetailsV1](raw, validate)
		if err != nil {
			return nil, err
		}
		return appcomponent.FrontendServiceDetails{CoreLanguage: details.Language, LanguageVersion: stringValue(details.LanguageVersion), MainFramework: stringValue(details.Framework)}, nil
	case inventory.ComponentTypeBackgroundWorker:
		details, err := httputil.DecodeAndValidateJSONBytes[BackgroundWorkerDetailsV1](raw, validate)
		if err != nil {
			return nil, err
		}
		return appcomponent.BackgroundWorkerDetails{CoreLanguage: details.Language, LanguageVersion: stringValue(details.LanguageVersion), MainFramework: stringValue(details.Framework), Broker: details.Broker}, nil
	case inventory.ComponentTypeInfrastructure:
		details, err := httputil.DecodeAndValidateJSONBytes[InfrastructureDetailsV1](raw, validate)
		if err != nil {
			return nil, err
		}
		return appcomponent.InfrastructureDetails{
			System:         details.System,
			Version:        stringValue(details.Version),
			NetworkAddress: stringValue(details.NetworkAddress),
		}, nil
	default:
		return nil, fmt.Errorf("%w: %q", inventory.ErrUnknownComponentType, componentType)
	}
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
