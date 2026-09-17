package apis

import (
	"context"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type Application struct {
	service *service
}

func NewApplication(store Store, txManager TxManager) *Application {
	return &Application{service: newService(store, txManager)}
}

func (a *Application) Create(ctx context.Context, command CreateCommand) (inventory.ComponentAPI, error) {
	return a.service.create(ctx, command)
}
