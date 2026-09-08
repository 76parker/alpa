package bootstrap

import (
	"context"
	"fmt"

	appworkspace "github.com/76parker/alpa/internal/applications/inventory/workspace"
	"github.com/76parker/alpa/internal/domain/inventory"
)

const (
	defaultWorkspaceName     = "default"
	defaultWorkspacePageSize = 100
)

type workspaceApplication interface {
	Create(context.Context, appworkspace.CreateCommand) (inventory.Workspace, error)
	List(context.Context, int, int) ([]inventory.Workspace, error)
}

func ensureDefaultWorkspace(ctx context.Context, application workspaceApplication) error {
	offset := 0
	for {
		workspaces, err := application.List(ctx, defaultWorkspacePageSize, offset)
		if err != nil {
			return fmt.Errorf("list workspaces: %w", err)
		}
		for _, workspace := range workspaces {
			if workspace.Name() == defaultWorkspaceName {
				return nil
			}
		}
		if len(workspaces) < defaultWorkspacePageSize {
			break
		}

		offset += len(workspaces)
	}

	if _, err := application.Create(ctx, appworkspace.CreateCommand{Name: defaultWorkspaceName}); err != nil {
		return fmt.Errorf("create default workspace: %w", err)
	}
	return nil
}
