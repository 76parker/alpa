package component

import (
	"context"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type Application struct {
	service *service
}

func NewApplication(store Store, txManager TxManager) *Application {
	return &Application{
		service: newService(store, txManager),
	}
}

func (a *Application) Create(ctx context.Context, command CreateCommand) (inventory.Component, error) {
	return a.service.create(ctx, command)
}

func (a *Application) Get(ctx context.Context, id int64) (inventory.Component, error) {
	return a.service.get(ctx, id)
}

func (a *Application) ListByProduct(ctx context.Context,
	productID int64,
	limit int,
	offset int,
) ([]inventory.Component, error) {
	return a.service.listByProduct(ctx, productID, limit, offset)
}

func (a *Application) Delete(ctx context.Context, id int64) error {
	return a.service.delete(ctx, id)
}
