package apis

import (
	"strings"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type CreateRequestV1 struct {
	Name            string                    `json:"name" validate:"max=50,allowed_text"`
	APIType         inventory.APIType         `json:"api_type" validate:"max=50,allowed_text"`
	NetworkExposure inventory.NetworkExposure `json:"network_exposure" validate:"max=50,allowed_text"`
}

func (r *CreateRequestV1) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.APIType = inventory.APIType(strings.TrimSpace(string(r.APIType)))
	r.NetworkExposure = inventory.NetworkExposure(strings.TrimSpace(string(r.NetworkExposure)))
}
