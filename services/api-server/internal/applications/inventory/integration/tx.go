package integration

import "context"

type TxManager interface {
	ExecuteWriteIntegrationTx(ctx context.Context, fn func(store Store) error) error
}
