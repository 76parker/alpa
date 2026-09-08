package postgres

import (
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func TestMapDatabaseError(t *testing.T) {
	t.Parallel()

	t.Run("not_found", func(t *testing.T) {
		t.Parallel()

		mapped := MapDatabaseError(pgx.ErrNoRows)
		if !errors.Is(mapped, ErrNotFound) {
			t.Fatalf("mapDatabaseError() error = %v, want %v", mapped, ErrNotFound)
		}
		if !errors.Is(mapped, pgx.ErrNoRows) {
			t.Fatalf("mapDatabaseError() lost pgx.ErrNoRows: %v", mapped)
		}
	})

	cases := []struct {
		name   string
		code   string
		target error
	}{
		{name: "invalid_enum", code: "22P02", target: ErrInvalidEnumValue},
		{name: "not_null", code: "23502", target: ErrNotNullViolation},
		{name: "foreign_key", code: "23503", target: ErrForeignKeyViolation},
		{name: "unique", code: "23505", target: ErrUniqueViolation},
		{name: "check", code: "23514", target: ErrCheckViolation},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			original := &pgconn.PgError{Code: tc.code}
			mapped := MapDatabaseError(original)
			if !errors.Is(mapped, tc.target) {
				t.Fatalf("mapDatabaseError() error = %v, want %v", mapped, tc.target)
			}
			unwrapped, ok := errors.AsType[*pgconn.PgError](mapped)
			if !ok || unwrapped != original {
				t.Fatalf("mapDatabaseError() lost original PgError: %v", mapped)
			}
		})
	}

	t.Run("unknown_error", func(t *testing.T) {
		t.Parallel()

		original := errors.New("connection failed")
		if mapped := MapDatabaseError(original); mapped != original {
			t.Fatalf("mapDatabaseError() error = %v, want original error", mapped)
		}
	})
}
