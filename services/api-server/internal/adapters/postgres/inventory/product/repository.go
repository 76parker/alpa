package product

import (
	"context"
	"errors"
	"fmt"

	"github.com/76parker/alpa/internal/adapters/postgres"
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/internal/sqlc"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/jackc/pgx/v5/pgconn"
)

const productWorkspaceForeignKey = "products_workspace_id_fkey"
const uniqueProductCodeConstraintName = "inventory_unique_product_code"

type Repository struct {
	queries *sqlc.Queries
}

func NewRepository(db postgres.DBTX) *Repository {
	return &Repository{queries: sqlc.New(db)}
}

func (r *Repository) Create(ctx context.Context, product *inventory.Product) (inventory.Product, error) {
	if product == nil {
		return inventory.Product{}, fmt.Errorf("create product: %w", postgres.ErrNilEntity)
	}

	row, err := r.queries.CreateProduct(ctx, sqlc.CreateProductParams{
		WorkspaceID:  product.WorkspaceID(),
		ProductCode:  product.ProductCode(),
		OwningTeamID: product.OwningTeamID(),
		Name:         product.Name(),
		Criticality:  sqlc.InventoryProductCriticality(product.Criticality()),
		Description:  product.Description(),
	})
	if err != nil {
		mappedErr := postgres.MapDatabaseError(err)
		pgErr, isPGError := errors.AsType[*pgconn.PgError](err)
		if isPGError && errors.Is(mappedErr, postgres.ErrForeignKeyViolation) {
			if pgErr.ConstraintName == productWorkspaceForeignKey {
				mappedErr = fmt.Errorf("%w: %w", postgres.ErrNotFound, mappedErr)
				return inventory.Product{}, fmt.Errorf("create product: %w", mappedErr)
			}
			if pgErr.ConstraintName == uniqueProductCodeConstraintName {
				mappedErr = fmt.Errorf("%w: %w", postgres.ErrUniqueViolation, mappedErr)
				return inventory.Product{}, fmt.Errorf("create product: %w", mappedErr)
			}
		}
		return inventory.Product{}, fmt.Errorf("create product: %w", mappedErr)
	}

	return productFromRow(row), nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (inventory.Product, error) {
	row, err := r.queries.GetProductByID(ctx, id)
	if err != nil {
		return inventory.Product{}, fmt.Errorf("get product by id: %w", postgres.MapDatabaseError(err))
	}

	return productFromRow(row), nil
}

func (r *Repository) ListByWorkspace(
	ctx context.Context,
	workspaceID int64,
	limit int,
	offset int,
) ([]inventory.Product, error) {
	rows, err := r.queries.ListProductsByWorkspaceID(ctx, sqlc.ListProductsByWorkspaceIDParams{
		WorkspaceID: workspaceID,
		Limit:       int32(limit),
		Offset:      int32(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("list products by workspace id: %w", postgres.MapDatabaseError(err))
	}

	products := make([]inventory.Product, 0, len(rows))
	for _, row := range rows {
		products = append(products, productFromRow(row))
	}

	return products, nil
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	if _, err := r.queries.DeleteProduct(ctx, id); err != nil {
		return fmt.Errorf("delete product: %w", postgres.MapDatabaseError(err))
	}

	return nil
}
