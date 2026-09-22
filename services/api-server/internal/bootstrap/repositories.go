package bootstrap

import (
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/apis"
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/client"
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/component"
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/integration"
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/product"
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/workspace"
	"github.com/76parker/alpa/internal/adapters/postgres/tx"
	"github.com/jackc/pgx/v5/pgxpool"
)

type repositories struct {
	apiRepo         *apis.Repository
	clientRepo      *client.Repository
	integrationRepo *integration.Repository
	componentRepo   *component.Repository
	productRepo     *product.Repository
	workspaceRepo   *workspace.Repository
	txManager       *tx.Manager
}

func newRepositories(db *pgxpool.Pool) *repositories {
	apiRepo := apis.NewRepository(db)
	clientRepo := client.NewRepository(db)
	integrationRepo := integration.NewRepository(db)
	return &repositories{
		apiRepo:         apiRepo,
		clientRepo:      clientRepo,
		integrationRepo: integrationRepo,
		componentRepo:   component.NewRepository(db),
		productRepo:     product.NewRepository(db),
		workspaceRepo:   workspace.NewRepository(db),
		txManager:       tx.NewManager(db),
	}
}
