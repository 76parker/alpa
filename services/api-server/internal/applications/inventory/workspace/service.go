package workspace

import (
	"context"
	"fmt"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type Store interface {
	Create(ctx context.Context, workspace inventory.Workspace) (inventory.Workspace, error)
	GetByID(ctx context.Context, id int64) (inventory.Workspace, error)
	List(ctx context.Context, limit, offset int) ([]inventory.Workspace, error)
	Delete(ctx context.Context, id int64) error
}

type service struct {
	store Store
}

func newService(store Store) *service {
	return &service{store: store}
}

func (s *service) create(ctx context.Context, command CreateCommand) (inventory.Workspace, error) {
	workspace, err := inventory.NewWorkspace(command.Name)
	if err != nil {
		return inventory.Workspace{}, fmt.Errorf("creating workspace model: %w", err)
	}

	created, err := s.store.Create(ctx, workspace)
	if err != nil {
		return inventory.Workspace{}, fmt.Errorf("creating workspace: %w", err)
	}

	return created, nil
}

func (s *service) get(ctx context.Context, id int64) (inventory.Workspace, error) {
	if id <= 0 {
		return inventory.Workspace{}, fmt.Errorf("getting workspace: %w", inventory.ErrNegativeID)
	}

	workspace, err := s.store.GetByID(ctx, id)
	if err != nil {
		return inventory.Workspace{}, fmt.Errorf("getting workspace: %w", err)
	}

	return workspace, nil
}

func (s *service) list(ctx context.Context, limit, offset int) ([]inventory.Workspace, error) {
	workspaces, err := s.store.List(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("listing workspaces: %w", err)
	}
	return workspaces, nil
}

func (s *service) delete(ctx context.Context, id int64) error {
	if id <= 0 {
		return fmt.Errorf("deleting workspace: %w", inventory.ErrNegativeID)
	}

	if err := s.store.Delete(ctx, id); err != nil {
		return fmt.Errorf("deleting workspace: %w", err)
	}

	return nil
}
