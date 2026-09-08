package product

import (
	"context"
	"fmt"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type Store interface {
	Create(ctx context.Context, product *inventory.Product) (inventory.Product, error)
	GetByID(ctx context.Context, id int64) (inventory.Product, error)
	ListByWorkspace(
		ctx context.Context,
		workspaceID int64,
		limit int,
		offset int,
	) ([]inventory.Product, error)
	Delete(ctx context.Context, id int64) error
}

type service struct {
	store Store
}

func newService(store Store) *service {
	return &service{store: store}
}

func (s *service) create(ctx context.Context, command CreateCommand) (inventory.Product, error) {
	product, err := inventory.NewProduct(
		command.WorkspaceID,
		command.ProductCode,
		command.OwningTeamID,
		command.Name,
		command.Criticality,
		command.Description,
	)
	if err != nil {
		return inventory.Product{}, fmt.Errorf("creating product model: %w", err)
	}

	created, err := s.store.Create(ctx, product)
	if err != nil {
		return inventory.Product{}, fmt.Errorf("creating product: %w", err)
	}

	return created, nil
}

func (s *service) get(ctx context.Context, id int64) (inventory.Product, error) {
	if id <= 0 {
		return inventory.Product{}, fmt.Errorf("getting product: %w", inventory.ErrNegativeID)
	}

	product, err := s.store.GetByID(ctx, id)
	if err != nil {
		return inventory.Product{}, fmt.Errorf("getting product: %w", err)
	}

	return product, nil
}

func (s *service) listByWorkspace(
	ctx context.Context,
	workspaceID int64,
	limit int,
	offset int,
) ([]inventory.Product, error) {
	if workspaceID <= 0 {
		return nil, fmt.Errorf("listing products: %w", inventory.ErrNegativeID)
	}

	products, err := s.store.ListByWorkspace(
		ctx,
		workspaceID,
		limit,
		offset,
	)
	if err != nil {
		return nil, fmt.Errorf("listing products: %w", err)
	}
	return products, nil
}

func (s *service) delete(ctx context.Context, id int64) error {
	if id <= 0 {
		return fmt.Errorf("deleting product: %w", inventory.ErrNegativeID)
	}

	if err := s.store.Delete(ctx, id); err != nil {
		return fmt.Errorf("deleting product: %w", err)
	}

	return nil
}
