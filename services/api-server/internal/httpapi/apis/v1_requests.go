package apis

import (
	"strings"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type CreateRequestV1 struct {
	Name             string                    `json:"name" validate:"max=50,allowed_text"`
	APIType          inventory.APIType         `json:"api_type" validate:"max=50,allowed_text"`
	NetworkExposure  inventory.NetworkExposure `json:"network_exposure" validate:"max=50,allowed_text"`
	DocumentationURL *string                   `json:"documentation_url,omitempty" validate:"omitempty,url,max=2048"`
}

type UpdateRequestV1 struct {
	Name             string                    `json:"name" validate:"required,max=50,allowed_text"`
	APIType          inventory.APIType         `json:"api_type" validate:"required,max=50,allowed_text"`
	NetworkExposure  inventory.NetworkExposure `json:"network_exposure" validate:"required,max=50,allowed_text"`
	DocumentationURL *string                   `json:"documentation_url,omitempty" validate:"omitempty,url,max=2048"`
}

func (r *CreateRequestV1) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.APIType = inventory.APIType(strings.TrimSpace(string(r.APIType)))
	r.NetworkExposure = inventory.NetworkExposure(strings.TrimSpace(string(r.NetworkExposure)))
	normalizeDocumentationURL(&r.DocumentationURL)
}

func (r *UpdateRequestV1) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.APIType = inventory.APIType(strings.TrimSpace(string(r.APIType)))
	r.NetworkExposure = inventory.NetworkExposure(strings.TrimSpace(string(r.NetworkExposure)))
	normalizeDocumentationURL(&r.DocumentationURL)
}

func normalizeDocumentationURL(value **string) {
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
