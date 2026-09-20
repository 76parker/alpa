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
	APIs        []CreateAPIRequestV1    `json:"apis" validate:"max=5,dive"`
	Clients     []CreateClientRequestV1 `json:"clients" validate:"max=5,dive"`
}

type CreateAPIRequestV1 struct {
	Name             string                    `json:"name" validate:"required,max=50,allowed_text"`
	APIType          inventory.APIType         `json:"api_type" validate:"required,max=50,allowed_text"`
	NetworkExposure  inventory.NetworkExposure `json:"network_exposure" validate:"required,max=50,allowed_text"`
	DocumentationURL *string                   `json:"documentation_url,omitempty" validate:"omitempty,url,max=2048"`
}

type CreateClientRequestV1 struct {
	ClientName       inventory.ComponentClientName `json:"client_name" validate:"required,max=50,allowed_text"`
	Role             inventory.ComponentClientRole `json:"role" validate:"required,max=50,allowed_text"`
	Action           *string                       `json:"action,omitempty"`
	Capabilities     *string                       `json:"capabilities,omitempty"`
	SecureConnection bool                          `json:"secure_connection"`
}

type BackendServiceDetailsV1 struct {
	Language      string  `json:"language" validate:"max=50,allowed_text"`
	RepositoryURL *string `json:"repository_url,omitempty" validate:"omitempty,url,max=2048"`
}

type FrontendServiceDetailsV1 struct {
	Language        string  `json:"language" validate:"max=50,allowed_text"`
	LanguageVersion *string `json:"language_version,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
	Framework       *string `json:"framework,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
}

type InfrastructureDetailsV1 struct {
	TechnologyName inventory.TechnologyName            `json:"technology_name" validate:"max=50,allowed_text"`
	Version        *string                             `json:"version,omitempty" validate:"omitempty,min=1,max=50,allowed_text"`
	TechnologyType inventory.TechnologyType            `json:"technology_type" validate:"max=50,allowed_text"`
	Importancy     inventory.InfrastructureCriticality `json:"importancy" validate:"required,max=50,allowed_text"`
	Endpoints      []string                            `json:"endpoints,omitempty" validate:"dive,min=1,max=50,allowed_text"`
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
		details, err := httputil.DecodeAndValidateJSONBytes[BackendServiceDetailsV1](raw, validate)
		if err != nil {
			return nil, err
		}
		language, err := inventory.NewLanguage(details.Language)
		if err != nil {
			return nil, err
		}
		return appcomponent.BackendServiceDetails{CoreLanguage: language, RepositoryURL: details.RepositoryURL}, nil
	case inventory.ComponentTypeFrontend:
		details, err := httputil.DecodeAndValidateJSONBytes[FrontendServiceDetailsV1](raw, validate)
		if err != nil {
			return nil, err
		}
		language, err := inventory.NewLanguage(details.Language)
		if err != nil {
			return nil, err
		}
		return appcomponent.FrontendServiceDetails{CoreLanguage: language, LanguageVersion: stringValue(details.LanguageVersion), MainFramework: stringValue(details.Framework)}, nil
	case inventory.ComponentTypeInfrastructure:
		details, err := httputil.DecodeAndValidateJSONBytes[InfrastructureDetailsV1](raw, validate)
		if err != nil {
			return nil, err
		}
		return appcomponent.InfrastructureDetails{
			TechnologyName: details.TechnologyName,
			Version:        stringValue(details.Version),
			TechnologyType: details.TechnologyType,
			Importancy:     details.Importancy,
			Endpoints:      details.Endpoints,
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
	for i := range r.Clients {
		r.Clients[i].Normalize()
	}
}

func (r *CreateAPIRequestV1) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.APIType = inventory.APIType(strings.TrimSpace(string(r.APIType)))
	r.NetworkExposure = inventory.NetworkExposure(strings.TrimSpace(string(r.NetworkExposure)))
	normalizeOptionalURL(&r.DocumentationURL)
}

func (r *CreateClientRequestV1) Normalize() {
	r.ClientName = inventory.ComponentClientName(strings.TrimSpace(string(r.ClientName)))
	r.Role = inventory.ComponentClientRole(strings.TrimSpace(string(r.Role)))
}

func normalizeOptionalURL(value **string) {
	if *value == nil {
		return
	}
	trimmed := strings.TrimSpace(**value)
	if trimmed == "" {
		*value = nil
		return
	}
	*value = &trimmed
}

func (r *BackendServiceDetailsV1) Normalize() {
	r.Language = strings.ToLower(strings.TrimSpace(r.Language))
	normalizeOptionalURL(&r.RepositoryURL)
}

func (r *FrontendServiceDetailsV1) Normalize() {
	r.Language = strings.ToLower(strings.TrimSpace(r.Language))
	trimOptional(r.LanguageVersion)
	trimOptional(r.Framework)
}

func (r *InfrastructureDetailsV1) Normalize() {
	r.TechnologyName = inventory.TechnologyName(strings.TrimSpace(string(r.TechnologyName)))
	r.TechnologyType = inventory.TechnologyType(strings.TrimSpace(string(r.TechnologyType)))
	r.Importancy = inventory.InfrastructureCriticality(strings.TrimSpace(string(r.Importancy)))
	trimOptional(r.Version)
	for i := range r.Endpoints {
		r.Endpoints[i] = strings.TrimSpace(r.Endpoints[i])
	}
}

func trimOptional(value *string) {
	if value != nil {
		*value = strings.TrimSpace(*value)
	}
}
