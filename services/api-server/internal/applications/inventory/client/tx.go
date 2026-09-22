package client

import "context"

type TxStores struct {
	Components   ComponentStore
	Clients      Store
	Integrations IntegrationStore
}

// TxManager manages transactions for client operations.
type TxManager interface {
	ExecuteWriteClientTx(ctx context.Context, fn func(store TxStores) error) error
}
