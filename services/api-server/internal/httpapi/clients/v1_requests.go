package clients

import (
	"strings"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type CreateRequestV1 struct {
	ClientName        inventory.ComponentClientName `json:"client_name" validate:"required,max=50,allowed_text"`
	Role              inventory.ComponentClientRole `json:"role" validate:"required,max=50,allowed_text"`
	CommunicationType inventory.CommunicationType   `json:"communication_type" validate:"required,max=50,allowed_text"`
	Description       *string                       `json:"description,omitempty" validate:"omitempty,min=1,max=1000,allowed_text"`
}

type BindAPIRequestV1 struct {
	APIID int64 `json:"api_id" validate:"required,gt=0"`
}

func (r *CreateRequestV1) Normalize() {
	r.ClientName = inventory.ComponentClientName(strings.TrimSpace(string(r.ClientName)))
	r.Role = inventory.ComponentClientRole(strings.TrimSpace(string(r.Role)))
	r.CommunicationType = inventory.CommunicationType(strings.TrimSpace(string(r.CommunicationType)))
	if r.Description != nil {
		*r.Description = strings.TrimSpace(*r.Description)
	}
}
