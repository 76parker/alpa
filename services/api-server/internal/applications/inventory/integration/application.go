package integration

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

func (a *Application) Create(ctx context.Context, command CreateCommand) (inventory.Integration, error) {
	return a.service.create(ctx, command)
}

func (a *Application) UpdateDescription(
	ctx context.Context,
	command UpdateDescriptionCommand,
) (inventory.Integration, error) {
	return a.service.updateDescription(ctx, command)
}

func (a *Application) Delete(ctx context.Context, integrationID int64) error {
	return a.service.delete(ctx, integrationID)
}
