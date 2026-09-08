package postgres

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var upMigrationName = regexp.MustCompile(`^(\d+)_.+\.up\.sql$`)

type migrationDB interface {
	Begin(ctx context.Context) (migrationTx, error)
}

type migrationTx interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Commit(ctx context.Context) error
	Rollback(ctx context.Context) error
}

type Migrator struct {
	db  migrationDB
	dir string
}

type migration struct {
	version int64
	name    string
	sql     string
}

func NewMigrator(pool *pgxpool.Pool, dir string) *Migrator {
	return newMigrator(poolMigrationDB{pool: pool}, dir)
}

func newMigrator(db migrationDB, dir string) *Migrator {
	return &Migrator{db: db, dir: dir}
}

func (m *Migrator) Migrate(ctx context.Context) error {
	migrations, err := discoverMigrations(m.dir)
	if err != nil {
		return err
	}

	tx, err := m.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin migration transaction: %w", err)
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	if _, err := tx.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version BIGINT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`); err != nil {
		return fmt.Errorf("create schema_migrations table: %w", err)
	}

	for _, migration := range migrations {
		applied, err := tx.Exec(ctx, `
			INSERT INTO schema_migrations (version)
			VALUES ($1)
			ON CONFLICT DO NOTHING
		`, migration.version)
		if err != nil {
			return fmt.Errorf("record migration %s: %w", migration.name, err)
		}
		if applied.RowsAffected() == 0 {
			continue
		}

		if _, err := tx.Exec(ctx, migration.sql); err != nil {
			return fmt.Errorf("apply migration %s: %w", migration.name, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit migrations: %w", err)
	}
	committed = true
	return nil
}

func discoverMigrations(dir string) ([]migration, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations directory: %w", err)
	}

	seenVersions := make(map[int64]string)
	migrations := make([]migration, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !upMigrationName.MatchString(entry.Name()) {
			continue
		}

		matches := upMigrationName.FindStringSubmatch(entry.Name())
		version, err := strconv.ParseInt(matches[1], 10, 64)
		if err != nil {
			return nil, fmt.Errorf("parse migration version from %q: %w", entry.Name(), err)
		}
		if previous, exists := seenVersions[version]; exists {
			return nil, fmt.Errorf("duplicate migration version %d in %q and %q", version, previous, entry.Name())
		}

		contents, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			return nil, fmt.Errorf("read migration %q: %w", entry.Name(), err)
		}
		seenVersions[version] = entry.Name()
		migrations = append(migrations, migration{
			version: version,
			name:    entry.Name(),
			sql:     string(contents),
		})
	}

	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].version < migrations[j].version
	})
	return migrations, nil
}

type poolMigrationDB struct {
	pool *pgxpool.Pool
}

func (db poolMigrationDB) Begin(ctx context.Context) (migrationTx, error) {
	return db.pool.Begin(ctx)
}
