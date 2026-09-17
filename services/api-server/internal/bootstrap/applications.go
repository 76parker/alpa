package bootstrap

import (
	"github.com/76parker/alpa/internal/applications/inventory/apis"
	"github.com/76parker/alpa/internal/applications/inventory/client"
	"github.com/76parker/alpa/internal/applications/inventory/component"
	"github.com/76parker/alpa/internal/applications/inventory/product"
	"github.com/76parker/alpa/internal/applications/inventory/workspace"
)

type applications struct {
	apiApp       *apis.Application
	clientApp    *client.Application
	componentApp *component.Application
	productApp   *product.Application
	workspaceApp *workspace.Application
}

func newApplications(repos *repositories) *applications {
	return &applications{
		apiApp:       apis.NewApplication(repos.apiRepo, repos.txManager),
		clientApp:    client.NewApplication(repos.clientRepo, repos.txManager),
		componentApp: component.NewApplication(repos.componentRepo, repos.txManager),
		productApp:   product.NewApplication(repos.productRepo),
		workspaceApp: workspace.NewApplication(repos.workspaceRepo),
	}
}
