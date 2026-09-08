package testutil

import (
	"context"
	"fmt"
	"reflect"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// DBTX provides deterministic pgx results for PostgreSQL adapter tests.
type DBTX struct {
	Row      pgx.Row
	Rows     pgx.Rows
	QueryErr error
}

func (db DBTX) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, fmt.Errorf("unexpected Exec call")
}

func (db DBTX) Query(context.Context, string, ...any) (pgx.Rows, error) {
	return db.Rows, db.QueryErr
}

func (db DBTX) QueryRow(context.Context, string, ...any) pgx.Row {
	return db.Row
}

type Row struct {
	Values []any
	Err    error
}

func (r Row) Scan(dest ...any) error {
	if r.Err != nil {
		return r.Err
	}

	return scan(dest, r.Values)
}

type Rows struct {
	Data  [][]any
	Error error
	index int
}

func (r *Rows) Close() {}

func (r *Rows) Err() error {
	return r.Error
}

func (r *Rows) CommandTag() pgconn.CommandTag {
	return pgconn.CommandTag{}
}

func (r *Rows) FieldDescriptions() []pgconn.FieldDescription {
	return nil
}

func (r *Rows) Next() bool {
	if r.index >= len(r.Data) {
		return false
	}

	r.index++
	return true
}

func (r *Rows) Scan(dest ...any) error {
	if r.index == 0 || r.index > len(r.Data) {
		return fmt.Errorf("Scan called without a current row")
	}

	return scan(dest, r.Data[r.index-1])
}

func (r *Rows) Values() ([]any, error) {
	if r.index == 0 || r.index > len(r.Data) {
		return nil, fmt.Errorf("Values called without a current row")
	}

	return r.Data[r.index-1], nil
}

func (r *Rows) RawValues() [][]byte {
	return nil
}

func (r *Rows) Conn() *pgx.Conn {
	return nil
}

func scan(dest []any, values []any) error {
	if len(dest) != len(values) {
		return fmt.Errorf("scan destinations = %d, values = %d", len(dest), len(values))
	}

	for index, value := range values {
		target := reflect.ValueOf(dest[index])
		if target.Kind() != reflect.Pointer || target.IsNil() {
			return fmt.Errorf("scan destination %d is not a non-nil pointer", index)
		}

		if value == nil {
			target.Elem().SetZero()
			continue
		}

		target.Elem().Set(reflect.ValueOf(value))
	}

	return nil
}
