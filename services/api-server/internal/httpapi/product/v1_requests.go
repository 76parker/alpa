package product

import (
	"github.com/76parker/alpa/internal/domain/inventory"
	"strings"
)

type CreateRequestV1 struct {
	OwningTeamID *int64                       `json:"owning_team_id,omitempty"`
	ProductCode  string                       `json:"product_code" validate:"max=10,allowed_text"`
	Name         string                       `json:"name" validate:"max=50,allowed_text"`
	Criticality  inventory.ProductCriticality `json:"criticality" validate:"max=50,allowed_text"`
	Description  *string                      `json:"description,omitempty" validate:"omitempty,min=1,max=1000,allowed_text"`
}

func (r *CreateRequestV1) Normalize() {
	r.ProductCode = strings.TrimSpace(r.ProductCode)
	r.Name = strings.TrimSpace(r.Name)
	r.Criticality = inventory.ProductCriticality(strings.TrimSpace(string(r.Criticality)))
	if r.Description != nil {
		*r.Description = strings.TrimSpace(*r.Description)
	}
}
