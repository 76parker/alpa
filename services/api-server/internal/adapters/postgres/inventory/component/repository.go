package component

import (
	"context"
	"errors"
	"fmt"

	postgres "github.com/76parker/alpa/internal/adapters/postgres"
	"github.com/76parker/alpa/internal/adapters/postgres/internal/sqlc"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/jackc/pgx/v5/pgconn"
)

const componentProductForeignKey = "components_product_id_fkey"

type Repository struct {
	queries *sqlc.Queries
}

func NewRepository(db postgres.DBTX) *Repository {
	return &Repository{
		queries: sqlc.New(db),
	}
}

func (r *Repository) Create(
	ctx context.Context,
	component inventory.Component,
) (inventory.Component, error) {
	details, err := Encode(component.Details())
	if err != nil {
		return inventory.Component{}, fmt.Errorf("create component: encode details: %w", err)
	}

	var description *string
	if component.Description() != "" {
		value := component.Description()
		description = &value
	}

	row, err := r.queries.CreateComponent(ctx, sqlc.CreateComponentParams{
		ProductID:     component.ProductID(),
		Name:          component.Name(),
		Description:   description,
		ComponentType: sqlc.InventoryComponentType(component.Type()),
		Details:       details,
	})
	if err != nil {
		mappedErr := postgres.MapDatabaseError(err)
		pgErr, isPGError := errors.AsType[*pgconn.PgError](err)
		if isPGError &&
			errors.Is(mappedErr, postgres.ErrForeignKeyViolation) &&
			pgErr.ConstraintName == componentProductForeignKey {
			mappedErr = fmt.Errorf("%w: %w", postgres.ErrNotFound, mappedErr)
		}
		return inventory.Component{}, fmt.Errorf("create component: %w", mappedErr)
	}

	created, err := componentFromRow(row, nil, nil)
	if err != nil {
		return inventory.Component{}, fmt.Errorf("create component: restore model: %w", err)
	}
	return created, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (inventory.Component, error) {
	var component inventory.Component
	row, err := r.queries.GetComponentByID(ctx, id)
	if err != nil {
		mappedErr := postgres.MapDatabaseError(err)
		return inventory.Component{}, fmt.Errorf("get component by id: %w", mappedErr)
	}
	component, err = componentFromRow(row, nil, nil)
	if err != nil {
		return inventory.Component{}, fmt.Errorf("get component by id: restore model: %w", err)
	}
	return component, nil
}

func (r *Repository) LockForUpdate(ctx context.Context, id int64) error {
	if _, err := r.queries.LockComponentForUpdate(ctx, id); err != nil {
		return fmt.Errorf("lock component for update: %w", postgres.MapDatabaseError(err))
	}
	return nil
}

func (r *Repository) ListByProduct(
	ctx context.Context,
	productID int64,
	limit int,
	offset int,
) ([]inventory.Component, error) {
	rows, err := r.queries.ListComponentsByProductID(ctx, sqlc.ListComponentsByProductIDParams{
		ProductID: productID,
		Limit:     int32(limit),
		Offset:    int32(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("list components by product: %w", err)
	}
	components := make([]inventory.Component, 0, len(rows))
	for _, row := range rows {
		component, err := componentFromRow(sqlc.InventoryComponent(row), nil, nil)
		if err != nil {
			return nil, fmt.Errorf("list components by product: restore model: %w", err)
		}
		components = append(components, component)
	}
	return components, nil
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	if _, err := r.queries.DeleteComponent(ctx, id); err != nil {
		return fmt.Errorf("delete component: %w", postgres.MapDatabaseError(err))
	}
	return nil
}
