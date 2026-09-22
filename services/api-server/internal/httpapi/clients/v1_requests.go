package clients

import (
	"strings"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type CreateRequestV1 struct {
	ClientName       inventory.ComponentClientName `json:"client_name" validate:"required,max=50,allowed_text"`
	Capabilities     *string                       `json:"capabilities,omitempty"`
	SecureConnection bool                          `json:"secure_connection"`
}

type UpdateRequestV1 struct {
	ClientName       inventory.ComponentClientName `json:"client_name" validate:"required,max=50,allowed_text"`
	Capabilities     *string                       `json:"capabilities,omitempty"`
	SecureConnection bool                          `json:"secure_connection"`
}

func (r *CreateRequestV1) Normalize() {
	r.ClientName = inventory.ComponentClientName(strings.TrimSpace(string(r.ClientName)))
}

func (r *UpdateRequestV1) Normalize() {
	r.ClientName = inventory.ComponentClientName(strings.TrimSpace(string(r.ClientName)))
}
