package product

import "github.com/76parker/alpa/internal/domain/inventory"

type ResponseV1 struct {
	ID           int64                        `json:"id"`
	WorkspaceID  int64                        `json:"workspace_id"`
	OwningTeamID *int64                       `json:"owning_team_id,omitempty"`
	ProductCode  string                       `json:"product_code"`
	Name         string                       `json:"name"`
	Criticality  inventory.ProductCriticality `json:"criticality"`
	Description  *string                      `json:"description,omitempty"`
}

func NewResponseV1(product inventory.Product) ResponseV1 {
	return ResponseV1{
		ID:           product.ID(),
		WorkspaceID:  product.WorkspaceID(),
		OwningTeamID: product.OwningTeamID(),
		ProductCode:  product.ProductCode(),
		Name:         product.Name(),
		Criticality:  product.Criticality(),
		Description:  product.Description(),
	}
}
