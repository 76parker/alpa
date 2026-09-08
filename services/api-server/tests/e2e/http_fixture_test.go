package e2e_test

import (
	"net/http/httptest"
	"time"

	repoworkspace "github.com/76parker/alpa/internal/adapters/postgres/inventory/workspace"
	appworkspace "github.com/76parker/alpa/internal/applications/inventory/workspace"
	"github.com/76parker/alpa/internal/httpapi"
	httpworkspace "github.com/76parker/alpa/internal/httpapi/workspace"
	"github.com/76parker/alpa/internal/observability/logger"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/jackc/pgx/v5/pgxpool"

	repocomponent "github.com/76parker/alpa/internal/adapters/postgres/inventory/component"
	appcomponent "github.com/76parker/alpa/internal/applications/inventory/component"
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

	componentRepository := repocomponent.NewRepository(pool)
	componentApplication := appcomponent.NewApplication(componentRepository)
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
	}
	server := httpapi.NewServer(testCfg, logger.NewMockLogger(), handlers)
	return httptest.NewServer(server.Handler()), nil
}
