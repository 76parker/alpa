package apis

import "context"

const maxChildrenPerComponent = 5

type TxStores struct {
	Components ComponentStore
	APIs       Store
}

type TxManager interface {
	ExecuteWriteAPITx(ctx context.Context, fn func(TxStores) error) error
}
