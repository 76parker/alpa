package integration

import (
	"context"
	"fmt"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type Store interface {
	GetClientForShare(ctx context.Context, clientID int64) (inventory.ComponentClient, int64, int64, error)
	GetAPIForShare(ctx context.Context, apiID int64) (int64, int64, error)
	Create(ctx context.Context, integration inventory.Integration) (inventory.Integration, error)
	GetForUpdate(ctx context.Context, integrationID int64) (inventory.Integration, error)
	Update(ctx context.Context, integration inventory.Integration) (inventory.Integration, error)
	Delete(ctx context.Context, integrationID int64) error
}

type service struct {
	store     Store
	txManager TxManager
}

func newService(store Store, txManager TxManager) *service {
	return &service{store: store, txManager: txManager}
}

func (s *service) create(ctx context.Context, command CreateCommand) (inventory.Integration, error) {
	candidate, err := inventory.NewIntegration(command.ClientID, command.APIID, command.Action, command.Description)
	if err != nil {
		return inventory.Integration{}, fmt.Errorf("create integration model: %w", err)
	}

	var created inventory.Integration
	err = s.txManager.ExecuteWriteIntegrationTx(ctx, func(store Store) error {
		client, clientComponentID, clientProductID, err := store.GetClientForShare(ctx, command.ClientID)
		if err != nil {
			return err
		}
		apiComponentID, apiProductID, err := store.GetAPIForShare(ctx, command.APIID)
		if err != nil {
			return err
		}
		if clientComponentID == apiComponentID || clientProductID != apiProductID {
			return inventory.ErrInvalidIntegration
		}
		if !client.SupportsAction(command.Action) {
			return inventory.ErrInvalidClientAction
		}
		created, err = store.Create(ctx, candidate)
		return err
	})
	if err != nil {
		return inventory.Integration{}, fmt.Errorf("create integration: %w", err)
	}
	return created, nil
}

func (s *service) updateDescription(
	ctx context.Context,
	command UpdateDescriptionCommand,
) (inventory.Integration, error) {
	if command.IntegrationID <= 0 {
		return inventory.Integration{}, inventory.ErrNegativeID
	}

	var updated inventory.Integration
	err := s.txManager.ExecuteWriteIntegrationTx(ctx, func(store Store) error {
		current, err := store.GetForUpdate(ctx, command.IntegrationID)
		if err != nil {
			return err
		}
		if err := current.UpdateDescription(command.Description); err != nil {
			return err
		}
		updated, err = store.Update(ctx, current)
		return err
	})
	if err != nil {
		return inventory.Integration{}, fmt.Errorf("update integration description: %w", err)
	}
	return updated, nil
}

func (s *service) delete(ctx context.Context, integrationID int64) error {
	if integrationID <= 0 {
		return inventory.ErrNegativeID
	}
	if err := s.store.Delete(ctx, integrationID); err != nil {
		return fmt.Errorf("delete integration: %w", err)
	}
	return nil
}
