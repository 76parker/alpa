package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		contents string
		wantErr  string
		wantAddr string
	}{
		{
			name: "valid configuration",
			contents: `logger:
  level: info
postgres:
  host: db.example.test
http:
  address: :8080
`,
			wantAddr: ":8080",
		},
		{
			name: "unknown field",
			contents: `logger:
  level: info
postgres:
  host: db.example.test
http:
  address: :8080
unexpected: true
`,
			wantErr: "unexpected",
		},
		{
			name: "missing HTTP section",
			contents: `logger:
  level: info
postgres:
  host: db.example.test
`,
			wantErr: "http",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// A malformed startup configuration must fail before infrastructure is initialized.
			configPath := filepath.Join(t.TempDir(), "config.yaml")
			if err := os.WriteFile(configPath, []byte(test.contents), 0o600); err != nil {
				t.Fatal(err)
			}

			cfg, err := LoadConfig(configPath)
			if test.wantErr != "" {
				if err == nil || !strings.Contains(strings.ToLower(err.Error()), test.wantErr) {
					t.Fatalf("LoadConfig() error = %v, want error containing %q", err, test.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if cfg.Logger == nil || cfg.Postgres == nil || cfg.HTTP == nil {
				t.Fatalf("LoadConfig() = %#v, want all top-level sections", cfg)
			}
			if cfg.HTTP.Address != test.wantAddr {
				t.Fatalf("HTTP.Address = %q, want %q", cfg.HTTP.Address, test.wantAddr)
			}
		})
	}
}

func TestUIAssetsConfiguration(t *testing.T) {
	// An omitted or empty path selects embedding; local paths retain cwd-relative semantics.
	for _, directory := range []string{"", "../frontend/dist"} {
		t.Run(directory, func(t *testing.T) {
			filename := filepath.Join(t.TempDir(), "config.yaml")
			body := "logger:\n  level: info\npostgres:\n  host: localhost\nhttp:\n  ui_assets_dir: \"" + directory + "\"\n"
			if err := os.WriteFile(filename, []byte(body), 0o600); err != nil {
				t.Fatal(err)
			}
			cfg, err := LoadConfig(filename)
			if err != nil {
				t.Fatal(err)
			}
			if cfg.HTTP.UIAssetsDir != directory {
				t.Fatalf("UIAssetsDir = %q", cfg.HTTP.UIAssetsDir)
			}
		})
	}
}
