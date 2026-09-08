package bootstrap

import (
	"fmt"

	"github.com/76parker/alpa/internal/httpapi"
	"github.com/76parker/alpa/internal/httpapi/component"
	"github.com/76parker/alpa/internal/httpapi/product"
	"github.com/76parker/alpa/internal/httpapi/workspace"
	"github.com/76parker/alpa/pkg/httputil"
)

func newHandlers(applications *applications) (httpapi.Handlers, error) {
	validate, err := httputil.NewValidator()
	if err != nil {
		return httpapi.Handlers{}, fmt.Errorf("create request validator: %w", err)
	}
	return httpapi.Handlers{
		Workspace: workspace.NewHandler(applications.workspaceApp, validate),
		Component: component.NewHandler(applications.componentApp, validate),
		Product:   product.NewHandler(applications.productApp, validate),
	}, nil
}
