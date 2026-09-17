package component

import (
	"context"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type APIStore interface {
	ListByComponentIDs(ctx context.Context, ids []int64) (map[int64][]inventory.ComponentAPI, error)
	BatchCreate(ctx context.Context, componentID int64, apis []inventory.ComponentAPI) ([]inventory.ComponentAPI, error)
}

type ClientStore interface {
	ListByComponentIDs(ctx context.Context, ids []int64) (map[int64][]inventory.ComponentClient, error)
	BatchCreate(ctx context.Context, componentID int64, clients []inventory.ComponentClient) ([]inventory.ComponentClient, error)
}

type TxStores struct {
	Components Store
	APIs       APIStore
	Clients    ClientStore
}

// TxManager manages transactions for the inventory component service
type TxManager interface {
	// WithComponentTx executes a repeatable read transaction for loading components (SELECT's only)
	ExecuteReadComponentTx(ctx context.Context, fn func(stores TxStores) error) error

	// WithWriteTx executes a write transaction for creating or updating components (INSERT/UPDATE)
	ExecuteWriteComponentTx(ctx context.Context, fn func(stores TxStores) error) error
}
