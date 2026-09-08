package product

import (
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/internal/sqlc"
	"github.com/76parker/alpa/internal/domain/inventory"
)

func productFromRow(row sqlc.InventoryProduct) inventory.Product {
	return inventory.RestoreProduct(
		row.ID,
		row.WorkspaceID,
		row.ProductCode,
		row.OwningTeamID,
		row.Name,
		inventory.ProductCriticality(row.Criticality),
		row.Description,
	)
}
