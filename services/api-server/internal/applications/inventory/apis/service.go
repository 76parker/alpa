package apis

import (
	"context"
	"fmt"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type Store interface {
	Create(ctx context.Context, componentID int64, api inventory.ComponentAPI) (inventory.ComponentAPI, error)
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

func (s *service) create(ctx context.Context, command CreateCommand) (inventory.ComponentAPI, error) {
	if command.ComponentID <= 0 {
		return inventory.ComponentAPI{}, inventory.ErrNegativeID
	}

	api, err := inventory.NewComponentAPI(command.Name, command.APIType, command.NetworkExposure)
	if err != nil {
		return inventory.ComponentAPI{}, fmt.Errorf("create domain api: %w", err)
	}

	var created inventory.ComponentAPI
	err = s.txManager.ExecuteWriteAPITx(ctx, func(stores TxStores) error {
		if err := stores.Components.LockForUpdate(ctx, command.ComponentID); err != nil {
			return err
		}
		count, err := stores.APIs.CountByComponentID(ctx, command.ComponentID)
		if err != nil {
			return err
		}
		if count >= maxChildrenPerComponent {
			return inventory.ErrAPILimitExceeded
		}
		created, err = stores.APIs.Create(ctx, command.ComponentID, api)
		return err
	})
	if err != nil {
		return inventory.ComponentAPI{}, fmt.Errorf("create api: %w", err)
	}
	return created, nil
}
