package bootstrap

import (
	"context"
	"errors"
	"testing"

	appworkspace "github.com/76parker/alpa/internal/applications/inventory/workspace"
	"github.com/76parker/alpa/internal/domain/inventory"
)

func TestEnsureDefaultWorkspace(t *testing.T) {
	t.Run("valid/creates_when_missing", func(t *testing.T) {
		// A fresh installation must get exactly one workspace named default.
		application := &workspaceApplicationStub{
			listResults: [][]inventory.Workspace{{}},
		}

		if err := ensureDefaultWorkspace(t.Context(), application); err != nil {
			t.Fatal(err)
		}
		if len(application.createCommands) != 1 {
			t.Fatalf("create calls = %d, want 1", len(application.createCommands))
		}
		if got := application.createCommands[0].Name; got != defaultWorkspaceName {
			t.Fatalf("created workspace name = %q, want %q", got, defaultWorkspaceName)
		}
	})

	t.Run("valid/skips_existing_workspace", func(t *testing.T) {
		// Startup must be idempotent when the default workspace already exists.
		application := &workspaceApplicationStub{
			listResults: [][]inventory.Workspace{{
				inventory.RestoreWorkspace(1, "existing"),
				inventory.RestoreWorkspace(2, defaultWorkspaceName),
			}},
		}

		if err := ensureDefaultWorkspace(t.Context(), application); err != nil {
			t.Fatal(err)
		}
		if len(application.createCommands) != 0 {
			t.Fatalf("create calls = %d, want 0", len(application.createCommands))
		}
	})

	t.Run("valid/finds_existing_workspace_on_later_page", func(t *testing.T) {
		// Existing installations can have more workspaces than one bootstrap page.
		firstPage := make([]inventory.Workspace, defaultWorkspacePageSize)
		for index := range firstPage {
			firstPage[index] = inventory.RestoreWorkspace(int64(index+1), "existing")
		}
		application := &workspaceApplicationStub{
			listResults: [][]inventory.Workspace{
				firstPage,
				{inventory.RestoreWorkspace(101, defaultWorkspaceName)},
			},
		}

		if err := ensureDefaultWorkspace(t.Context(), application); err != nil {
			t.Fatal(err)
		}
		if len(application.createCommands) != 0 {
			t.Fatalf("create calls = %d, want 0", len(application.createCommands))
		}
		if len(application.listOffsets) != 2 || application.listOffsets[0] != 0 || application.listOffsets[1] != defaultWorkspacePageSize {
			t.Fatalf("list offsets = %v, want [0 %d]", application.listOffsets, defaultWorkspacePageSize)
		}
	})

	t.Run("invalid/list_failure", func(t *testing.T) {
		// A failed existence check must stop startup instead of creating blindly.
		listErr := errors.New("list failed")
		application := &workspaceApplicationStub{listErr: listErr}

		err := ensureDefaultWorkspace(t.Context(), application)
		if !errors.Is(err, listErr) {
			t.Fatalf("error = %v, want wrapped %v", err, listErr)
		}
		if len(application.createCommands) != 0 {
			t.Fatalf("create calls = %d, want 0", len(application.createCommands))
		}
	})

	t.Run("invalid/create_failure", func(t *testing.T) {
		// A failed default creation must stop startup and preserve the cause.
		createErr := errors.New("create failed")
		application := &workspaceApplicationStub{
			listResults: [][]inventory.Workspace{{}},
			createErr:   createErr,
		}

		err := ensureDefaultWorkspace(t.Context(), application)
		if !errors.Is(err, createErr) {
			t.Fatalf("error = %v, want wrapped %v", err, createErr)
		}
	})
}

type workspaceApplicationStub struct {
	listResults    [][]inventory.Workspace
	listErr        error
	createErr      error
	listCalls      int
	listOffsets    []int
	createCommands []appworkspace.CreateCommand
}

func (s *workspaceApplicationStub) List(
	_ context.Context,
	_ int,
	offset int,
) ([]inventory.Workspace, error) {
	s.listOffsets = append(s.listOffsets, offset)
	if s.listErr != nil {
		return nil, s.listErr
	}
	if s.listCalls >= len(s.listResults) {
		return []inventory.Workspace{}, nil
	}

	result := s.listResults[s.listCalls]
	s.listCalls++
	return result, nil
}

func (s *workspaceApplicationStub) Create(
	_ context.Context,
	command appworkspace.CreateCommand,
) (inventory.Workspace, error) {
	s.createCommands = append(s.createCommands, command)
	if s.createErr != nil {
		return inventory.Workspace{}, s.createErr
	}
	return inventory.RestoreWorkspace(1, command.Name), nil
}
