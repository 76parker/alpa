package bootstrap

import (
	"github.com/76parker/alpa/internal/applications/inventory/component"
	"github.com/76parker/alpa/internal/applications/inventory/product"
	"github.com/76parker/alpa/internal/applications/inventory/workspace"
)

type applications struct {
	componentApp *component.Application
	productApp   *product.Application
	workspaceApp *workspace.Application
}

func newApplications(repos *repositories) *applications {
	return &applications{
		componentApp: component.NewApplication(repos.componentRepo),
		productApp:   product.NewApplication(repos.productRepo),
		workspaceApp: workspace.NewApplication(repos.workspaceRepo),
	}
}
