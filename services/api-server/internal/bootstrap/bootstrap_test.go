package bootstrap

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/76parker/alpa/internal/config"
	"github.com/76parker/alpa/internal/observability/logger"
)

func TestUIValidatedBeforeDatabase(t *testing.T) {
	// Nil PostgreSQL configuration would panic if database initialization ran first.
	cfg := config.Config{
		Logger: &logger.SlogConfig{Level: "info", OnlyStdout: true},
		HTTP:   &config.HTTPConfig{UIAssetsDir: filepath.Join(t.TempDir(), "missing")},
	}
	if err := Run(context.Background(), cfg, ""); err == nil || !strings.Contains(err.Error(), "bootstrap UI") {
		t.Fatalf("Run error = %v", err)
	}
}
