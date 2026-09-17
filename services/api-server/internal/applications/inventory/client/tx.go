package client

import "context"

type TxStores struct {
	Components ComponentStore
	Clients    Store
}

// TxManager manages transactions for client operations.
type TxManager interface {
	// BindClientAPITx executes client API binding using a transaction-scoped store.
	BindClientAPITx(ctx context.Context, fn func(store TxStores) error) error

	ExecuteWriteClientTx(ctx context.Context, fn func(store TxStores) error) error
}
