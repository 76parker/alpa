package tx

import (
	"context"

	"github.com/76parker/alpa/internal/adapters/postgres/inventory/apis"
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/client"
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/component"
	appapis "github.com/76parker/alpa/internal/applications/inventory/apis"
	appclient "github.com/76parker/alpa/internal/applications/inventory/client"
	appcomponent "github.com/76parker/alpa/internal/applications/inventory/component"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Manager struct {
	pool *pgxpool.Pool
}

func NewManager(pool *pgxpool.Pool) *Manager {
	return &Manager{
		pool: pool,
	}
}

// BindClientAPITx executes client API binding in a transaction.
func (m *Manager) BindClientAPITx(ctx context.Context, executeTx func(stores appclient.TxStores) error) error {
	return pgx.BeginFunc(ctx, m.pool, func(tx pgx.Tx) error {
		return executeTx(appclient.TxStores{
			Components: component.NewRepository(tx),
			Clients:    client.NewRepository(tx),
		})
	})
}

// ExecuteWriteAPITx executes a write transaction for creating or updating APIs (INSERT/UPDATE)
func (m *Manager) ExecuteWriteAPITx(ctx context.Context, executeTx func(stores appapis.TxStores) error) error {
	return pgx.BeginFunc(ctx, m.pool, func(tx pgx.Tx) error {
		return executeTx(appapis.TxStores{
			Components: component.NewRepository(tx),
			APIs:       apis.NewRepository(tx),
		})
	})
}

// ExecuteReadComponentTx executes a transaction that loads full component aggregate from db (component + clients + apis)
func (m *Manager) ExecuteReadComponentTx(ctx context.Context, executeTx func(stores appcomponent.TxStores) error) error {
	txOpts := pgx.TxOptions{
		IsoLevel:   pgx.RepeatableRead,
		AccessMode: pgx.ReadOnly,
	}
	txFunc := func(tx pgx.Tx) error {
		stores := appcomponent.TxStores{
			Components: component.NewRepository(tx),
			Clients:    client.NewRepository(tx),
			APIs:       apis.NewRepository(tx),
		}
		return executeTx(stores)
	}
	if err := pgx.BeginTxFunc(ctx, m.pool, txOpts, txFunc); err != nil {
		return err
	}
	return nil
}

// ExecuteWriteComponentTx executes a write transaction for creating or updating components (INSERT/UPDATE)
func (m *Manager) ExecuteWriteComponentTx(ctx context.Context, executeTx func(stores appcomponent.TxStores) error) error {
	txOpts := pgx.TxOptions{
		IsoLevel:   pgx.ReadCommitted,
		AccessMode: pgx.ReadWrite,
	}
	txFunc := func(tx pgx.Tx) error {
		stores := appcomponent.TxStores{
			Components: component.NewRepository(tx),
			Clients:    client.NewRepository(tx),
			APIs:       apis.NewRepository(tx),
		}
		return executeTx(stores)
	}
	if err := pgx.BeginTxFunc(ctx, m.pool, txOpts, txFunc); err != nil {
		return err
	}
	return nil
}

// ExecuteWriteClientTx executes a write transaction for creating or updating clients (INSERT/UPDATE)
func (m *Manager) ExecuteWriteClientTx(ctx context.Context, executeTx func(stores appclient.TxStores) error) error {
	return pgx.BeginFunc(ctx, m.pool, func(tx pgx.Tx) error {
		return executeTx(appclient.TxStores{
			Components: component.NewRepository(tx),
			Clients:    client.NewRepository(tx),
		})
	})
}
