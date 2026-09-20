package clients

import (
	"strings"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type CreateRequestV1 struct {
	ClientName       inventory.ComponentClientName `json:"client_name" validate:"required,max=50,allowed_text"`
	Role             inventory.ComponentClientRole `json:"role" validate:"required,max=50,allowed_text"`
	Action           *string                       `json:"action,omitempty"`
	Capabilities     *string                       `json:"capabilities,omitempty"`
	SecureConnection bool                          `json:"secure_connection"`
}

type UpdateRequestV1 struct {
	ClientName       inventory.ComponentClientName `json:"client_name" validate:"required,max=50,allowed_text"`
	Role             inventory.ComponentClientRole `json:"role" validate:"required,max=50,allowed_text"`
	Action           *string                       `json:"action,omitempty"`
	Capabilities     *string                       `json:"capabilities,omitempty"`
	SecureConnection bool                          `json:"secure_connection"`
}

type BindAPIRequestV1 struct {
	APIID int64 `json:"api_id" validate:"required,gt=0"`
}

func (r *CreateRequestV1) Normalize() {
	r.ClientName = inventory.ComponentClientName(strings.TrimSpace(string(r.ClientName)))
	r.Role = inventory.ComponentClientRole(strings.TrimSpace(string(r.Role)))
}

func (r *UpdateRequestV1) Normalize() {
	r.ClientName = inventory.ComponentClientName(strings.TrimSpace(string(r.ClientName)))
	r.Role = inventory.ComponentClientRole(strings.TrimSpace(string(r.Role)))
}
