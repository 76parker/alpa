package product

import "github.com/76parker/alpa/internal/domain/inventory"

type CreateRequestV1 struct {
	OwningTeamID *int64                       `json:"owning_team_id,omitempty" validate:"omitempty,gt=0"`
	ProductCode  string                       `json:"product_code" validate:"required,max=10,product_code"`
	Name         string                       `json:"name" validate:"required,max=50,allowed_text"`
	Criticality  inventory.ProductCriticality `json:"criticality" validate:"required,oneof=MISSION-CRITICAL BUSINESS-CRITICAL BUSINESS-OPERATIONAL OFFICE-PRODUCTIVITY"`
	Description  *string                      `json:"description,omitempty" validate:"omitempty,min=1,max=1000,allowed_text"`
}
