package client

import (
	"context"
	"fmt"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type Store interface {
	Create(ctx context.Context, componentID int64, client inventory.ComponentClient) (inventory.ComponentClient, error)
	BindAPI(ctx context.Context, componentID, clientID, apiID int64) (inventory.ComponentClient, error)
	CountByComponentID(ctx context.Context, componentID int64) (int, error)
}

type ComponentStore interface {
	LockForUpdate(ctx context.Context, componentID int64) error
}

type service struct {
	store     Store
	txManager TxManager
}

func newService(store Store, txManager TxManager) *service {
	return &service{store: store, txManager: txManager}
}

func (s *service) bindAPI(ctx context.Context, command BindAPICommand) (inventory.ComponentClient, error) {
	if command.ComponentID <= 0 || command.ClientID <= 0 || command.APIID <= 0 {
		return inventory.ComponentClient{}, inventory.ErrNegativeID
	}

	var client inventory.ComponentClient
	if err := s.txManager.BindClientAPITx(ctx, func(stores TxStores) error {
		updated, err := stores.Clients.BindAPI(ctx, command.ComponentID, command.ClientID, command.APIID)
		if err != nil {
			return err
		}
		client = updated
		return nil
	}); err != nil {
		return inventory.ComponentClient{}, fmt.Errorf("bind client API: %w", err)
	}
	return client, nil
}

func (s *service) create(ctx context.Context, command CreateCommand) (inventory.ComponentClient, error) {
	if command.ComponentID <= 0 {
		return inventory.ComponentClient{}, inventory.ErrNegativeID
	}
	var client inventory.ComponentClient
	txFunc := func(stores TxStores) error {
		if err := stores.Components.LockForUpdate(ctx, command.ComponentID); err != nil {
			return err
		}
		count, err := stores.Clients.CountByComponentID(ctx, command.ComponentID)
		if err != nil {
			return err
		}
		if count >= 5 {
			return inventory.ErrClientLimitExceeded
		}

		newClient, err := inventory.NewComponentClient(
			command.ClientName,
			command.Role,
			command.CommunicationType,
			command.Description,
		)
		if err != nil {
			return err
		}

		created, err := stores.Clients.Create(ctx, command.ComponentID, newClient)
		if err != nil {
			return err
		}
		client = created
		return nil
	}

	if err := s.txManager.ExecuteWriteClientTx(ctx, txFunc); err != nil {
		return inventory.ComponentClient{}, fmt.Errorf("create client: %w", err)
	}
	return client, nil
}
