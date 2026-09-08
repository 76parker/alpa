package e2e_test

import (
	"context"
	"fmt"
	"path/filepath"

	"github.com/76parker/alpa/internal/adapters/postgres"
	"github.com/jackc/pgx/v5/pgxpool"
	pgtest "github.com/testcontainers/testcontainers-go/modules/postgres"
)

const (
	postgresImage    = "postgres:16.4"
	postgresDatabase = "test"
	postgresUser     = "postgres"
	postgresPassword = "postgres"
)

type postgresFixture struct {
	container *pgtest.PostgresContainer
	pool      *pgxpool.Pool
}

func startPostgres(ctx context.Context) (*postgresFixture, error) {
	container, err := pgtest.Run(ctx,
		postgresImage,
		pgtest.WithDatabase(postgresDatabase),
		pgtest.WithUsername(postgresUser),
		pgtest.WithPassword(postgresPassword),
		pgtest.BasicWaitStrategies(),
	)
	if err != nil {
		return nil, err
	}
	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		_ = container.Terminate(ctx)
		return nil, err
	}
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		_ = container.Terminate(ctx)
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		_ = container.Terminate(ctx)
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return &postgresFixture{
		container: container,
		pool:      pool,
	}, nil
}

func (f *postgresFixture) Close(ctx context.Context) error {
	f.pool.Close()
	return f.container.Terminate(ctx)
}

func migrateDatabase(ctx context.Context, pool *pgxpool.Pool) error {
	migrationsDir, err := filepath.Abs(
		filepath.Join("..", "..", "migrations"),
	)
	if err != nil {
		return fmt.Errorf("resolve migrations directory: %w", err)
	}

	if err := postgres.NewMigrator(pool, migrationsDir).Migrate(ctx); err != nil {
		return fmt.Errorf("migrate test database: %w", err)
	}

	return nil
}
