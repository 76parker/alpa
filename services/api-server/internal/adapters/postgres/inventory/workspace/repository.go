package workspace

import (
	"context"
	"fmt"

	postgres "github.com/76parker/alpa/internal/adapters/postgres"
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/internal/sqlc"
	"github.com/76parker/alpa/internal/domain/inventory"
)

type Repository struct {
	queries *sqlc.Queries
}

func NewRepository(db postgres.DBTX) *Repository {
	return &Repository{queries: sqlc.New(db)}
}

func (r *Repository) Create(ctx context.Context, workspace inventory.Workspace) (inventory.Workspace, error) {
	row, err := r.queries.CreateWorkspace(ctx, workspace.Name())
	if err != nil {
		return inventory.Workspace{}, fmt.Errorf("create workspace: %w", postgres.MapDatabaseError(err))
	}
	return workspaceFromRow(row), nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (inventory.Workspace, error) {
	row, err := r.queries.GetWorkspaceByID(ctx, id)
	if err != nil {
		return inventory.Workspace{}, fmt.Errorf("get workspace by id: %w", postgres.MapDatabaseError(err))
	}
	return workspaceFromRow(row), nil
}

func (r *Repository) List(ctx context.Context, limit, offset int) ([]inventory.Workspace, error) {
	rows, err := r.queries.ListWorkspaces(ctx, sqlc.ListWorkspacesParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("list workspaces: %w", postgres.MapDatabaseError(err))
	}

	workspaces := make([]inventory.Workspace, 0, len(rows))
	for _, row := range rows {
		workspaces = append(workspaces, workspaceFromRow(row))
	}
	return workspaces, nil
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	if _, err := r.queries.DeleteWorkspace(ctx, id); err != nil {
		return fmt.Errorf("delete workspace: %w", postgres.MapDatabaseError(err))
	}
	return nil
}
