package bootstrap

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"time"

	postgres "github.com/76parker/alpa/internal/adapters/postgres"
	"github.com/76parker/alpa/internal/config"
	"github.com/76parker/alpa/internal/httpapi"
	"github.com/76parker/alpa/internal/observability/logger"
)

const shutdownTimeout = 10 * time.Second

func Run(ctx context.Context, cfg config.Config, migrationsDir string) (returnErr error) {
	log, err := logger.NewSlog(*cfg.Logger)
	if err != nil {
		return fmt.Errorf("bootstrap logger: %w", err)
	}
	defer func() {
		if err := log.Close(); err != nil {
			returnErr = errors.Join(returnErr, fmt.Errorf("close logger: %w", err))
		}
	}()

	pool, err := postgres.NewPool(ctx, *cfg.Postgres)
	if err != nil {
		return fmt.Errorf("bootstrap postgres: %w", err)
	}
	defer pool.Close()
	logPostgreSQLConnected(log, *cfg.Postgres)

	if err := postgres.NewMigrator(pool, migrationsDir).Migrate(ctx); err != nil {
		return fmt.Errorf("migrate postgres: %w", err)
	}
	repos := newRepositories(pool)
	apps := newApplications(repos)
	if err := ensureDefaultWorkspace(ctx, apps.workspaceApp); err != nil {
		return fmt.Errorf("ensure default workspace: %w", err)
	}
	handlers, err := newHandlers(apps)
	if err != nil {
		return fmt.Errorf("create handlers: %w", err)
	}
	server := httpapi.NewServer(newServerConfig(*cfg.HTTP), log, handlers)

	logSwaggerDocumentation(log, cfg.HTTP.Address)
	log.Info("Starting HTTP server", "address", cfg.HTTP.Address)
	serverErr := make(chan error, 1)
	go func() {
		serverErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("serve HTTP: %w", err)
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("shutdown HTTP server: %w", err)
		}
		if err := <-serverErr; !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("serve HTTP: %w", err)
		}

		log.Info("HTTP server stopped")
		return nil
	}
}

func documentationURL(address string) string {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return "http://" + address + "/docs"
	}
	if host == "" || host == "0.0.0.0" || host == "::" {
		host = "localhost"
	}

	return "http://" + net.JoinHostPort(host, port) + "/docs"
}

func logPostgreSQLConnected(log logger.Logger, cfg config.PostgresConfig) {
	log.Info("Connected to PostgreSQL", "host", cfg.Host, "database", cfg.Database)
}

func logSwaggerDocumentation(log logger.Logger, address string) {
	log.Info("Swagger documentation is available", "url", documentationURL(address))
}

func newServerConfig(cfg config.HTTPConfig) httpapi.ServerConfig {
	return httpapi.ServerConfig{
		Address:           cfg.Address,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
		MaxHeaderBytes:    cfg.MaxHeaderBytes,
	}
}
