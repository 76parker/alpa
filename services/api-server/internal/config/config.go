package config

import (
	"fmt"
	"os"
	"time"

	"github.com/76parker/alpa/internal/observability/logger"
	"github.com/go-playground/validator/v10"
	"github.com/goccy/go-yaml"
)

type Config struct {
	Logger   *logger.SlogConfig
	Postgres *PostgresConfig
	HTTP     *HTTPConfig
}

type PostgresConfig struct {
	Host       string     `yaml:"host" validate:"required,hostname_rfc1123|ip"`
	Port       int        `yaml:"port" validate:"required,min=3000,max=65535"`
	Database   string     `yaml:"database" validate:"required"`
	SSL        string     `yaml:"ssl" validate:"required"`
	Username   string     `yaml:"username" validate:"required"`
	Password   string     `yaml:"password" validate:"required"`
	PoolConfig PoolConfig `yaml:"pool_config" validate:"required"`
}

type PoolConfig struct {
	MaxConnections        int           `yaml:"max_connections" validate:"required,min=1,max=100"`
	MinConnections        int           `yaml:"min_connections" validate:"required,min=1"`
	MaxConnectionLifetime time.Duration `yaml:"max_connection_lifetime" validate:"required,gt=0"`
	MaxConnIdleTime       time.Duration `yaml:"max_conn_idle_time" validate:"required,gt=0"`
	HealthCheckPeriod     time.Duration `yaml:"health_check_period" validate:"required,gt=0"`
	ConnectTimeout        time.Duration `yaml:"connect_timeout" validate:"required,gt=0"`
}

type HTTPConfig struct {
	UIAssetsDir       string        `yaml:"ui_assets_dir"`
	Address           string        `yaml:"address" validate:"required"`
	ReadHeaderTimeout time.Duration `yaml:"read_header_timeout" validate:"required,gt=0"`
	ReadTimeout       time.Duration `yaml:"read_timeout" validate:"required,gt=0"`
	WriteTimeout      time.Duration `yaml:"write_timeout" validate:"required,gt=0"`
	IdleTimeout       time.Duration `yaml:"idle_timeout" validate:"required,gt=0"`
	MaxHeaderBytes    int           `yaml:"max_header_bytes" validate:"required,gt=0"`
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
	v := validator.New()
	if err := v.Struct(cfg); err != nil {
		return Config{}, fmt.Errorf("validate configuration: %w", err)
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
