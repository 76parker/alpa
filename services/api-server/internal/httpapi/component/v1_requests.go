package component

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"

	appcomponent "github.com/76parker/alpa/internal/applications/inventory/component"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/go-playground/validator/v10"
)

type CreateRequestV1 struct {
	ProductID   int64                   `json:"product_id"`
	Name        string                  `json:"name" validate:"max=50,allowed_text"`
	Type        inventory.ComponentType `json:"type" validate:"max=50,allowed_text"`
	Description *string                 `json:"description,omitempty" validate:"omitempty,min=1,max=1000,allowed_text"`
	Details     json.RawMessage         `json:"details"`
	APIs        []APIRequestV1          `json:"apis,omitempty" validate:"dive"`
}

type ConsumerAPICreateRequestV1 struct {
	APIID int64 `json:"api_id"`
}

type APIRequestV1 struct {
	Name            string                    `json:"name" validate:"max=50,allowed_text"`
	APIType         inventory.APIType         `json:"api_type" validate:"max=50,allowed_text"`
	NetworkExposure inventory.NetworkExposure `json:"network_exposure" validate:"max=50,allowed_text"`
}

type ServiceDetailsV1 struct {
	Language        string  `json:"language" validate:"max=50,allowed_text"`
	LanguageVersion *string `json:"language_version,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
	Framework       *string `json:"framework,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
}

type BackgroundWorkerDetailsV1 struct {
	Language        string                    `json:"language" validate:"max=50,allowed_text"`
	LanguageVersion *string                   `json:"language_version,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
	Framework       *string                   `json:"framework,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
	Broker          inventory.EventBrokerType `json:"broker" validate:"max=50,allowed_text"`
}

type InfrastructureDetailsV1 struct {
	System         string               `json:"system" validate:"max=50,allowed_text"`
	Version        *string              `json:"version,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
	SystemType     inventory.SystemType `json:"system_type" validate:"max=50,allowed_text"`
	NetworkAddress []string             `json:"network_address,omitempty" validate:"dive,min=1,max=50,allowed_text"`
}

func decodeDetails(
	componentType inventory.ComponentType,
	raw json.RawMessage,
	validate *validator.Validate,
) (appcomponent.Details, error) {
	if len(bytes.TrimSpace(raw)) == 0 || bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return nil, nil
	}
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
			SystemType:     details.SystemType,
			NetworkAddress: details.NetworkAddress,
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

func (r *CreateRequestV1) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Type = inventory.ComponentType(strings.TrimSpace(string(r.Type)))
	trimOptional(r.Description)
	for i := range r.APIs {
		r.APIs[i].Normalize()
	}
}

func (r *APIRequestV1) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.APIType = inventory.APIType(strings.TrimSpace(string(r.APIType)))
	r.NetworkExposure = inventory.NetworkExposure(strings.TrimSpace(string(r.NetworkExposure)))
}

func (r *ServiceDetailsV1) Normalize() {
	r.Language = strings.TrimSpace(r.Language)
	trimOptional(r.LanguageVersion)
	trimOptional(r.Framework)
}

func (r *BackgroundWorkerDetailsV1) Normalize() {
	r.Language = strings.TrimSpace(r.Language)
	r.Broker = inventory.EventBrokerType(strings.TrimSpace(string(r.Broker)))
	trimOptional(r.LanguageVersion)
	trimOptional(r.Framework)
}

func (r *InfrastructureDetailsV1) Normalize() {
	r.System = strings.TrimSpace(r.System)
	r.SystemType = inventory.SystemType(strings.TrimSpace(string(r.SystemType)))
	trimOptional(r.Version)
	for i := range r.NetworkAddress {
		r.NetworkAddress[i] = strings.TrimSpace(r.NetworkAddress[i])
	}
}

func trimOptional(value *string) {
	if value != nil {
		*value = strings.TrimSpace(*value)
	}
}
