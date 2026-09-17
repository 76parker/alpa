package workspace

import (
	"github.com/76parker/alpa/internal/adapters/postgres/internal/sqlc"
	"github.com/76parker/alpa/internal/domain/inventory"
)

func workspaceFromRow(row sqlc.InventoryWorkspace) inventory.Workspace {
	return inventory.RestoreWorkspace(row.ID, row.Name)
}
