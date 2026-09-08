package postgres

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strconv"

	"github.com/76parker/alpa/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, cfg config.PostgresConfig) (*pgxpool.Pool, error) {
	poolConfig, err := newPoolConfig(cfg)
	if err != nil {
		return nil, err
	}

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("open postgres pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return pool, nil
}

func newPoolConfig(cfg config.PostgresConfig) (*pgxpool.Config, error) {
	connectionURL := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(cfg.Username, cfg.Password),
		Host:   net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port)),
		Path:   cfg.Database,
	}
	query := connectionURL.Query()
	query.Set("sslmode", cfg.SSL)
	connectionURL.RawQuery = query.Encode()

	poolConfig, err := pgxpool.ParseConfig(connectionURL.String())
	if err != nil {
		return nil, fmt.Errorf("parse postgres configuration: %w", err)
	}
	poolConfig.MaxConns = int32(cfg.PoolConfig.MaxConnections)
	poolConfig.MinConns = int32(cfg.PoolConfig.MinConnections)
	poolConfig.MaxConnLifetime = cfg.PoolConfig.MaxConnectionLifetime
	poolConfig.MaxConnIdleTime = cfg.PoolConfig.MaxConnIdleTime
	poolConfig.HealthCheckPeriod = cfg.PoolConfig.HealthCheckPeriod
	poolConfig.ConnConfig.ConnectTimeout = cfg.PoolConfig.ConnectTimeout
	return poolConfig, nil
}
