package product

import "github.com/76parker/alpa/internal/domain/inventory"

type CreateCommand struct {
	WorkspaceID  int64
	ProductCode  string
	OwningTeamID *int64
	Name         string
	Criticality  inventory.ProductCriticality
	Description  *string
}
