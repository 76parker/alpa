package postgres

import (
	"testing"
	"time"

	"github.com/76parker/alpa/internal/config"
)

func TestNewPoolConfig(t *testing.T) {
	t.Parallel()

	cfg, err := newPoolConfig(config.PostgresConfig{
		Host:     "db.example.test",
		Port:     5433,
		Database: "inventory",
		SSL:      "require",
		Username: "alpa",
		Password: "secret with spaces",
		PoolConfig: config.PoolConfig{
			MaxConnections:        12,
			MinConnections:        3,
			MaxConnectionLifetime: time.Hour,
			MaxConnIdleTime:       15 * time.Minute,
			HealthCheckPeriod:     time.Minute,
			ConnectTimeout:        5 * time.Second,
		},
	})
	if err != nil {
		t.Fatal(err)
	}

	if cfg.ConnConfig.Host != "db.example.test" || cfg.ConnConfig.Port != 5433 {
		t.Fatalf("connection = %s:%d, want db.example.test:5433", cfg.ConnConfig.Host, cfg.ConnConfig.Port)
	}
	if cfg.ConnConfig.Database != "inventory" || cfg.ConnConfig.User != "alpa" || cfg.ConnConfig.Password != "secret with spaces" {
		t.Fatalf("connection config = %#v, want configured database and credentials", cfg.ConnConfig)
	}
	if cfg.ConnConfig.TLSConfig == nil || !cfg.ConnConfig.TLSConfig.InsecureSkipVerify {
		t.Fatal("TLS configuration does not reflect sslmode=require")
	}
	if cfg.MaxConns != 12 || cfg.MinConns != 3 {
		t.Fatalf("connections = (%d, %d), want (12, 3)", cfg.MaxConns, cfg.MinConns)
	}
	if cfg.MaxConnLifetime != time.Hour || cfg.MaxConnIdleTime != 15*time.Minute || cfg.HealthCheckPeriod != time.Minute {
		t.Fatalf("pool durations = (%s, %s, %s), want configured values", cfg.MaxConnLifetime, cfg.MaxConnIdleTime, cfg.HealthCheckPeriod)
	}
	if cfg.ConnConfig.ConnectTimeout != 5*time.Second {
		t.Fatalf("connect timeout = %s, want 5s", cfg.ConnConfig.ConnectTimeout)
	}
}
