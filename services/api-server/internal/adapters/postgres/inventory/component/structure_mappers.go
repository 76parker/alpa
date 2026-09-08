package component

import (
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/internal/sqlc"
	"github.com/76parker/alpa/internal/domain/inventory"
)

func componentFromRow(row sqlc.InventoryComponent, apis []inventory.ComponentAPI) (inventory.Component, error) {
	details, err := Decode(inventory.ComponentType(row.ComponentType), row.Details)
	if err != nil {
		return inventory.Component{}, err
	}

	return inventory.RestoreComponent(
		row.ID,
		row.ProductID,
		row.Name,
		stringValue(row.Description),
		details,
		apis,
	)
}
