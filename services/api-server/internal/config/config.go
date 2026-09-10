package config

import (
	"fmt"
	"os"
	"time"

	"github.com/76parker/alpa/internal/observability/logger"
	"github.com/goccy/go-yaml"
)

type Config struct {
	Logger   *logger.SlogConfig
	Postgres *PostgresConfig
	HTTP     *HTTPConfig
}

type PostgresConfig struct {
	Host       string     `yaml:"host" validate:"required"`
	Port       int        `yaml:"port" validate:"required"`
	Database   string     `yaml:"database" validate:"required"`
	SSL        string     `yaml:"ssl" validate:"required"`
	Username   string     `yaml:"username" validate:"required"`
	Password   string     `yaml:"password" validate:"required"`
	PoolConfig PoolConfig `yaml:"pool_config" validate:"required"`
}

type PoolConfig struct {
	MaxConnections        int           `yaml:"max_connections" validate:"required"`
	MinConnections        int           `yaml:"min_connections" validate:"required"`
	MaxConnectionLifetime time.Duration `yaml:"max_connection_lifetime" validate:"required"`
	MaxConnIdleTime       time.Duration `yaml:"max_conn_idle_time" validate:"required"`
	HealthCheckPeriod     time.Duration `yaml:"health_check_period" validate:"required"`
	ConnectTimeout        time.Duration `yaml:"connect_timeout" validate:"required"`
}

type HTTPConfig struct {
	UIAssetsDir       string        `yaml:"ui_assets_dir"`
	Address           string        `yaml:"address"`
	ReadHeaderTimeout time.Duration `yaml:"read_header_timeout"`
	ReadTimeout       time.Duration `yaml:"read_timeout"`
	WriteTimeout      time.Duration `yaml:"write_timeout"`
	IdleTimeout       time.Duration `yaml:"idle_timeout"`
	MaxHeaderBytes    int           `yaml:"max_header_bytes"`
}

// LoadConfig reads, decodes, and validates the application configuration at path.
func LoadConfig(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, fmt.Errorf("read configuration: %w", err)
	}

	var cfg Config
	if err := yaml.UnmarshalWithOptions(data, &cfg, yaml.Strict()); err != nil {
		return Config{}, fmt.Errorf("decode configuration: %w", err)
	}
	if cfg.Logger == nil {
		return Config{}, fmt.Errorf("configuration logger section is required")
	}
	if cfg.Postgres == nil {
		return Config{}, fmt.Errorf("configuration postgres section is required")
	}
	if cfg.HTTP == nil {
		return Config{}, fmt.Errorf("configuration http section is required")
	}

	return cfg, nil
}
