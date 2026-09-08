package bootstrap

import (
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/component"
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/product"
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/workspace"
	"github.com/jackc/pgx/v5/pgxpool"
)

type repositories struct {
	componentRepo *component.Repository
	productRepo   *product.Repository
	workspaceRepo *workspace.Repository
}

func newRepositories(db *pgxpool.Pool) *repositories {
	return &repositories{
		componentRepo: component.NewRepository(db),
		productRepo:   product.NewRepository(db),
		workspaceRepo: workspace.NewRepository(db),
	}
}
