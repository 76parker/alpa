package e2e_test

import (
	"context"
	"net/http/httptest"
	"time"

	repoworkspace "github.com/76parker/alpa/internal/adapters/postgres/inventory/workspace"
	appworkspace "github.com/76parker/alpa/internal/applications/inventory/workspace"
	"github.com/76parker/alpa/internal/httpapi"
	httpworkspace "github.com/76parker/alpa/internal/httpapi/workspace"
	"github.com/76parker/alpa/internal/observability/logger"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/jackc/pgx/v5/pgxpool"

	repoapis "github.com/76parker/alpa/internal/adapters/postgres/inventory/apis"
	repoclients "github.com/76parker/alpa/internal/adapters/postgres/inventory/client"
	repocomponent "github.com/76parker/alpa/internal/adapters/postgres/inventory/component"
	"github.com/76parker/alpa/internal/adapters/postgres/tx"
	appapis "github.com/76parker/alpa/internal/applications/inventory/apis"
	appclients "github.com/76parker/alpa/internal/applications/inventory/client"
	appcomponent "github.com/76parker/alpa/internal/applications/inventory/component"
	httpapis "github.com/76parker/alpa/internal/httpapi/apis"
	httpclients "github.com/76parker/alpa/internal/httpapi/clients"
	httpcomponent "github.com/76parker/alpa/internal/httpapi/component"

	repoproduct "github.com/76parker/alpa/internal/adapters/postgres/inventory/product"
	appproduct "github.com/76parker/alpa/internal/applications/inventory/product"
	httpproduct "github.com/76parker/alpa/internal/httpapi/product"
)

func newTestHTTPServer(pool *pgxpool.Pool) (*httptest.Server, error) {
	validate, err := httputil.NewValidator()
	if err != nil {
		return nil, err
	}

	workspaceRepository := repoworkspace.NewRepository(pool)
	workspaceApplication := appworkspace.NewApplication(workspaceRepository)
	workspaceHandler := httpworkspace.NewHandler(workspaceApplication, validate)

	apiRepository := repoapis.NewRepository(pool)
	txManager := tx.NewManager(pool)
	apiApplication := appapis.NewApplication(apiRepository, txManager)
	apiHandler := httpapis.NewHandler(apiApplication, validate)

	clientRepository := repoclients.NewRepository(pool)
	clientApplication := appclients.NewApplication(clientRepository, txManager)
	clientHandler := httpclients.NewHandler(clientApplication, validate)

	componentRepository := repocomponent.NewRepository(pool)
	componentApplication := appcomponent.NewApplication(componentRepository, txManager)
	componentHandler := httpcomponent.NewHandler(componentApplication, validate)

	componentProduct := repoproduct.NewRepository(pool)
	appProduct := appproduct.NewApplication(componentProduct)
	productHandler := httpproduct.NewHandler(appProduct, validate)
	testCfg := httpapi.ServerConfig{
		Address:           ":8080",
		ReadHeaderTimeout: 1 * time.Second,
		ReadTimeout:       1 * time.Second,
		WriteTimeout:      1 * time.Second,
		IdleTimeout:       1 * time.Second,
		MaxHeaderBytes:    1024 * 1024,
	}
	handlers := httpapi.Handlers{
		Workspace: workspaceHandler,
		Product:   productHandler,
		Component: componentHandler,
		APIs:      apiHandler,
		Clients:   clientHandler,
	}

	server := httpapi.NewServer(context.Background(), testCfg, logger.NewMockLogger(), handlers)
	return httptest.NewServer(server.Handler()), nil
}
