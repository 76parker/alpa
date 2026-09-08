package component

import (
	"context"
	"errors"
	"fmt"
	"sort"

	postgres "github.com/76parker/alpa/internal/adapters/postgres"
	"github.com/76parker/alpa/internal/adapters/postgres/inventory/internal/sqlc"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const componentProductForeignKey = "components_product_id_fkey"

type Repository struct {
	db      transactionDB
	queries *sqlc.Queries
}

type transactionDB interface {
	postgres.DBTX
	BeginTx(ctx context.Context, txOptions pgx.TxOptions) (pgx.Tx, error)
}

func NewRepository(db transactionDB) *Repository {
	return &Repository{
		db:      db,
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

	var created inventory.Component
	err = pgx.BeginTxFunc(ctx, r.db, pgx.TxOptions{}, func(tx pgx.Tx) error {
		queries := r.queries.WithTx(tx)
		row, err := queries.CreateComponent(ctx, sqlc.CreateComponentParams{
			ProductID:     component.ProductID(),
			Name:          component.Name(),
			Description:   description,
			ComponentType: sqlc.InventoryComponentType(component.Type()),
			Details:       details,
		})
		if err != nil {
			return err
		}

		providerAPIs := component.APIs()
		createdAPIs := make([]inventory.ComponentAPI, 0, len(providerAPIs))
		for _, componentAPI := range providerAPIs {
			apiRow, err := queries.CreateProviderAPI(ctx, sqlc.CreateProviderAPIParams{
				ProviderComponentID: row.ID,
				Name:                componentAPI.API.Name(),
				ApiType:             string(componentAPI.API.APIType()),
				NetworkExposure:     sqlc.InventoryNetworkExposure(componentAPI.API.Exposure()),
			})
			if err != nil {
				return err
			}
			createdAPIs = append(createdAPIs, inventory.ComponentAPI{
				API: inventory.RestoreAPI(
					apiRow.ID,
					apiRow.Name,
					inventory.NetworkExposure(apiRow.NetworkExposure),
					inventory.APIType(apiRow.ApiType),
				),
				Role: inventory.APIRoleProvider,
			})
		}

		created, err = componentFromRow(row, createdAPIs)
		return err
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

	return created, nil
}

func (r *Repository) GetAPIProviderComponentID(ctx context.Context, apiID int64) (int64, error) {
	providerComponentID, err := r.queries.GetAPIProviderComponentID(ctx, apiID)
	if err != nil {
		return 0, fmt.Errorf("get api provider component id: %w", postgres.MapDatabaseError(err))
	}

	return providerComponentID, nil
}

func (r *Repository) AddConsumerAPI(ctx context.Context, componentID, apiID int64) error {
	err := r.queries.AddConsumerAPI(ctx, sqlc.AddConsumerAPIParams{
		ComponentID: componentID,
		ApiID:       apiID,
	})
	if err != nil {
		mappedErr := postgres.MapDatabaseError(err)
		if errors.Is(mappedErr, postgres.ErrUniqueViolation) {
			return fmt.Errorf("add consumer api: %w", inventory.ErrConsumerAPIAlreadyExists)
		}
		return fmt.Errorf("add consumer api: %w", mappedErr)
	}

	return nil
}

func (r *Repository) RemoveConsumerAPI(ctx context.Context, componentID, apiID int64) error {
	_, err := r.queries.RemoveConsumerAPI(ctx, sqlc.RemoveConsumerAPIParams{
		ComponentID: componentID,
		ApiID:       apiID,
	})
	if err != nil {
		return fmt.Errorf("remove consumer api: %w", postgres.MapDatabaseError(err))
	}

	return nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (inventory.Component, error) {
	rows, err := r.queries.GetComponentByID(ctx, id)
	if err != nil {
		return inventory.Component{}, fmt.Errorf("get component by id: %w", postgres.MapDatabaseError(err))
	}
	if len(rows) == 0 {
		return inventory.Component{}, fmt.Errorf("get component by id: %w", postgres.ErrNotFound)
	}

	flatRows := make([]flatComponentRow, 0, len(rows))
	for _, row := range rows {
		flatRows = append(flatRows, flatComponentRow{
			component: sqlc.InventoryComponent{
				ID:            row.ID,
				ProductID:     row.ProductID,
				Name:          row.Name,
				Description:   row.Description,
				ComponentType: row.ComponentType,
				Details:       row.Details,
			},
			apiID:              row.ApiID,
			apiName:            row.ApiName,
			apiType:            row.ApiType,
			apiNetworkExposure: row.ApiNetworkExposure,
			apiRole:            row.ApiRole,
		})
	}
	components, err := componentsFromFlatRows(flatRows)
	if err != nil {
		return inventory.Component{}, fmt.Errorf("get component by id: restore model: %w", err)
	}

	return components[0], nil
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
		return nil, fmt.Errorf("list components by product: %w", postgres.MapDatabaseError(err))
	}

	flatRows := make([]flatComponentRow, 0, len(rows))
	for _, row := range rows {
		flatRows = append(flatRows, flatComponentRow{
			component: sqlc.InventoryComponent{
				ID:            row.ID,
				ProductID:     row.ProductID,
				Name:          row.Name,
				Description:   row.Description,
				ComponentType: row.ComponentType,
				Details:       row.Details,
			},
			apiID:              row.ApiID,
			apiName:            row.ApiName,
			apiType:            row.ApiType,
			apiNetworkExposure: row.ApiNetworkExposure,
			apiRole:            row.ApiRole,
		})
	}

	components, err := componentsFromFlatRows(flatRows)
	if err != nil {
		return nil, fmt.Errorf("list components by product: restore model: %w", err)
	}

	return components, nil
}

type flatComponentRow struct {
	component          sqlc.InventoryComponent
	apiID              int64
	apiName            string
	apiType            string
	apiNetworkExposure sqlc.InventoryNetworkExposure
	apiRole            string
}

type componentGroup struct {
	component sqlc.InventoryComponent
	apis      []inventory.ComponentAPI
}

func componentsFromFlatRows(rows []flatComponentRow) ([]inventory.Component, error) {
	groups := make([]componentGroup, 0)
	groupIndexes := make(map[int64]int)
	for _, row := range rows {
		groupIndex, ok := groupIndexes[row.component.ID]
		if !ok {
			groupIndex = len(groups)
			groupIndexes[row.component.ID] = groupIndex
			groups = append(groups, componentGroup{
				component: row.component,
				apis:      make([]inventory.ComponentAPI, 0),
			})
		}

		if row.apiID == 0 {
			continue
		}
		groups[groupIndex].apis = append(groups[groupIndex].apis, inventory.ComponentAPI{
			API: inventory.RestoreAPI(
				row.apiID,
				row.apiName,
				inventory.NetworkExposure(row.apiNetworkExposure),
				inventory.APIType(row.apiType),
			),
			Role: inventory.APIRole(row.apiRole),
		})
	}

	components := make([]inventory.Component, 0, len(groups))
	for _, group := range groups {
		sort.Slice(group.apis, func(i, j int) bool {
			left := group.apis[i]
			right := group.apis[j]
			if left.Role != right.Role {
				return apiRoleOrder(left.Role) < apiRoleOrder(right.Role)
			}
			return left.API.ID() < right.API.ID()
		})

		component, err := componentFromRow(group.component, group.apis)
		if err != nil {
			return nil, err
		}
		components = append(components, component)
	}

	return components, nil
}

func apiRoleOrder(role inventory.APIRole) int {
	if role == inventory.APIRoleProvider {
		return 0
	}
	return 1
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	if _, err := r.queries.DeleteComponent(ctx, id); err != nil {
		return fmt.Errorf("delete component: %w", postgres.MapDatabaseError(err))
	}

	return nil
}
