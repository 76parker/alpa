package component

import (
	"context"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type Application struct {
	service *service
}

func NewApplication(store Store) *Application {
	return &Application{
		service: newService(store),
	}
}

func (a *Application) Create(ctx context.Context, command CreateInput) (inventory.Component, error) {
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

func (a *Application) AddConsumerAPI(ctx context.Context, componentID, apiID int64) error {
	return a.service.addConsumerAPI(ctx, componentID, apiID)
}

func (a *Application) RemoveConsumerAPI(ctx context.Context, componentID, apiID int64) error {
	return a.service.removeConsumerAPI(ctx, componentID, apiID)
}
