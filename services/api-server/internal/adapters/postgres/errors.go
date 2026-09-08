package postgres

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrNotFound            = errors.New("entity not found")
	ErrInvalidEnumValue    = errors.New("invalid enum value")
	ErrForeignKeyViolation = errors.New("foreign key constraint violation")
	ErrNotNullViolation    = errors.New("not-null constraint violation")
	ErrUniqueViolation     = errors.New("unique constraint violation")
	ErrCheckViolation      = errors.New("check constraint violation")
	ErrNilEntity           = errors.New("entity is nil")
)

func MapDatabaseError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("%w: %w", ErrNotFound, err)
	}

	pgErr, ok := errors.AsType[*pgconn.PgError](err)
	if !ok {
		return err
	}

	var mapped error
	switch pgErr.Code {
	case "22P02":
		mapped = ErrInvalidEnumValue
	case "23502":
		mapped = ErrNotNullViolation
	case "23503":
		mapped = ErrForeignKeyViolation
	case "23505":
		mapped = ErrUniqueViolation
	case "23514":
		mapped = ErrCheckViolation
	default:
		return err
	}

	return fmt.Errorf("%w: %w", mapped, err)
}
