package workspace

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

func (a *Application) Create(ctx context.Context, command CreateCommand) (inventory.Workspace, error) {
	return a.service.create(ctx, command)
}

func (a *Application) Get(ctx context.Context, id int64) (inventory.Workspace, error) {
	return a.service.get(ctx, id)
}

func (a *Application) List(ctx context.Context, limit, offset int) ([]inventory.Workspace, error) {
	return a.service.list(ctx, limit, offset)
}

func (a *Application) Delete(ctx context.Context, id int64) error {
	return a.service.delete(ctx, id)
}
