package product

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

func (a *Application) Create(ctx context.Context, command CreateCommand) (inventory.Product, error) {
	return a.service.create(ctx, command)
}

func (a *Application) Get(ctx context.Context, id int64) (inventory.Product, error) {
	return a.service.get(ctx, id)
}

func (a *Application) ListByWorkspace(
	ctx context.Context,
	workspaceID int64,
	limit int,
	offset int,
) ([]inventory.Product, error) {
	return a.service.listByWorkspace(ctx, workspaceID, limit, offset)
}

func (a *Application) Delete(ctx context.Context, id int64) error {
	return a.service.delete(ctx, id)
}
