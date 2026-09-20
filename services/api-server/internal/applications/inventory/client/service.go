package client

import (
	"context"
	"fmt"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type Store interface {
	Create(ctx context.Context, componentID int64, client inventory.ComponentClient) (inventory.ComponentClient, error)
	Update(ctx context.Context, componentID, clientID int64, client inventory.ComponentClient) (inventory.ComponentClient, error)
	BindAPI(ctx context.Context, componentID, clientID, apiID int64) (inventory.ComponentClient, error)
	CountByComponentID(ctx context.Context, componentID int64) (int, error)
	Delete(ctx context.Context, componentID int64, clientID int64) error
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
			command.Action,
			command.Capabilities,
			command.SecureConnection,
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

func (s *service) update(ctx context.Context, command UpdateCommand) (inventory.ComponentClient, error) {
	if command.ComponentID <= 0 || command.ClientID <= 0 {
		return inventory.ComponentClient{}, inventory.ErrNegativeID
	}
	updated, err := inventory.NewComponentClient(
		command.ClientName,
		command.Role,
		command.Action,
		command.Capabilities,
		command.SecureConnection,
	)
	if err != nil {
		return inventory.ComponentClient{}, fmt.Errorf("update domain client: %w", err)
	}
	var stored inventory.ComponentClient
	err = s.txManager.ExecuteWriteClientTx(ctx, func(stores TxStores) error {
		stored, err = stores.Clients.Update(ctx, command.ComponentID, command.ClientID, updated)
		return err
	})
	if err != nil {
		return inventory.ComponentClient{}, fmt.Errorf("update client: %w", err)
	}
	return stored, nil
}

func (s *service) delete(ctx context.Context, componentID int64, clientID int64) error {
	if componentID <= 0 || clientID <= 0 {
		return inventory.ErrNegativeID
	}
	if err := s.store.Delete(ctx, componentID, clientID); err != nil {
		return fmt.Errorf("delete client: %w", err)
	}
	return nil
}
