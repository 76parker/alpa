package client

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

func (a *Application) Create(ctx context.Context, command CreateCommand) (inventory.ComponentClient, error) {
	return a.service.create(ctx, command)
}

func (a *Application) Update(ctx context.Context, command UpdateCommand) (inventory.ComponentClient, error) {
	return a.service.update(ctx, command)
}

func (a *Application) BindAPI(ctx context.Context, command BindAPICommand) (inventory.ComponentClient, error) {
	return a.service.bindAPI(ctx, command)
}

func (a *Application) Delete(ctx context.Context, componentID int64, clientID int64) error {
	return a.service.delete(ctx, componentID, clientID)
}
