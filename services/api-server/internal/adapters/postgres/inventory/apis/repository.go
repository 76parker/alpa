package apis

import (
	"context"
	"errors"
	"fmt"
	"sort"

	postgres "github.com/76parker/alpa/internal/adapters/postgres"
	"github.com/76parker/alpa/internal/adapters/postgres/internal/sqlc"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/jackc/pgx/v5/pgconn"
)

const componentForeignKey = "apis_component_id_fkey"

type Repository struct {
	queries *sqlc.Queries
}

func NewRepository(db postgres.DBTX) *Repository {
	return &Repository{queries: sqlc.New(db)}
}

func (r *Repository) Create(
	ctx context.Context,
	componentID int64,
	api inventory.ComponentAPI,
) (inventory.ComponentAPI, error) {
	row, err := r.queries.CreateAPI(ctx, sqlc.CreateAPIParams{
		ComponentID:     componentID,
		Name:            api.Name(),
		ApiType:         string(api.APIType()),
		NetworkExposure: sqlc.InventoryNetworkExposure(api.Exposure()),
	})
	if err != nil {
		return inventory.ComponentAPI{}, fmt.Errorf("create api: %w", mapCreateError(err))
	}

	return inventory.RestoreAPI(
		row.ID,
		row.Name,
		inventory.NetworkExposure(row.NetworkExposure),
		inventory.APIType(row.ApiType),
	), nil
}

func (r *Repository) BatchCreate(
	ctx context.Context,
	componentID int64,
	apis []inventory.ComponentAPI,
) ([]inventory.ComponentAPI, error) {
	created := make([]inventory.ComponentAPI, 0, len(apis))
	if len(apis) == 0 {
		return created, nil
	}

	params := sqlc.BatchCreateAPIsParams{
		ComponentID:      componentID,
		Names:            make([]string, 0, len(apis)),
		ApiTypes:         make([]string, 0, len(apis)),
		NetworkExposures: make([]string, 0, len(apis)),
	}
	for _, api := range apis {
		params.Names = append(params.Names, api.Name())
		params.ApiTypes = append(params.ApiTypes, string(api.APIType()))
		params.NetworkExposures = append(params.NetworkExposures, string(api.Exposure()))
	}

	rows, err := r.queries.BatchCreateAPIs(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("batch create apis: %w", mapCreateError(err))
	}
	for _, row := range rows {
		created = append(created, inventory.RestoreAPI(
			row.ID,
			row.Name,
			inventory.NetworkExposure(row.NetworkExposure),
			inventory.APIType(row.ApiType),
		))
	}
	sort.Slice(created, func(i, j int) bool { return created[i].ID() < created[j].ID() })
	return created, nil
}

func (r *Repository) CountByComponentID(ctx context.Context, componentID int64) (int, error) {
	count, err := r.queries.CountAPIsByComponentID(ctx, componentID)
	if err != nil {
		return 0, fmt.Errorf("count APIs by component id: %w", postgres.MapDatabaseError(err))
	}
	return int(count), nil
}

func (r *Repository) ListByComponentIDs(
	ctx context.Context,
	componentIDs []int64,
) (map[int64][]inventory.ComponentAPI, error) {
	grouped := make(map[int64][]inventory.ComponentAPI, len(componentIDs))
	if len(componentIDs) == 0 {
		return grouped, nil
	}

	rows, err := r.queries.ListAPIsByComponentIDs(ctx, componentIDs)
	if err != nil {
		return nil, fmt.Errorf("list apis by component ids: %w", postgres.MapDatabaseError(err))
	}
	for _, row := range rows {
		grouped[row.ComponentID] = append(
			grouped[row.ComponentID],
			inventory.RestoreAPI(
				row.ID,
				row.Name,
				inventory.NetworkExposure(row.NetworkExposure),
				inventory.APIType(row.ApiType),
			),
		)
	}
	for componentID := range grouped {
		sort.Slice(grouped[componentID], func(i, j int) bool {
			return grouped[componentID][i].ID() < grouped[componentID][j].ID()
		})
	}
	return grouped, nil
}

func mapCreateError(err error) error {
	mapped := postgres.MapDatabaseError(err)
	pgErr, ok := errors.AsType[*pgconn.PgError](err)
	if ok && errors.Is(mapped, postgres.ErrForeignKeyViolation) && pgErr.ConstraintName == componentForeignKey {
		return fmt.Errorf("%w: %w", postgres.ErrNotFound, mapped)
	}
	return mapped
}
