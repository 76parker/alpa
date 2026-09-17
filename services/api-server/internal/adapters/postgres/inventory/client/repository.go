package client

import (
	"context"
	"errors"
	"fmt"
	"sort"

	postgres "github.com/76parker/alpa/internal/adapters/postgres"
	"github.com/76parker/alpa/internal/adapters/postgres/internal/sqlc"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const componentForeignKey = "component_clients_component_id_fkey"

type Repository struct {
	queries *sqlc.Queries
}

func NewRepository(db postgres.DBTX) *Repository {
	return &Repository{queries: sqlc.New(db)}
}

func (r *Repository) Create(
	ctx context.Context,
	componentID int64,
	client inventory.ComponentClient,
) (inventory.ComponentClient, error) {
	var description *string
	if client.Description() != "" {
		value := client.Description()
		description = &value
	}

	row, err := r.queries.CreateClient(ctx, sqlc.CreateClientParams{
		ComponentID:       componentID,
		ClientName:        string(client.Type().ClientName()),
		Role:              string(client.Type().Role()),
		CommunicationType: string(client.Type().CommunicationType()),
		Description:       description,
	})
	if err != nil {
		return inventory.ComponentClient{}, fmt.Errorf("create client: %w", mapCreateError(err))
	}

	return inventory.RestoreComponentClient(
		row.ID,
		inventory.ComponentClientName(row.ClientName),
		inventory.ComponentClientRole(row.Role),
		inventory.CommunicationType(row.CommunicationType),
		stringValue(row.Description),
		row.ApiID,
	), nil
}

func (r *Repository) BatchCreate(
	ctx context.Context,
	componentID int64,
	clients []inventory.ComponentClient,
) ([]inventory.ComponentClient, error) {
	created := make([]inventory.ComponentClient, 0, len(clients))
	if len(clients) == 0 {
		return created, nil
	}

	params := sqlc.BatchCreateClientsParams{
		ComponentID:        componentID,
		ClientNames:        make([]string, 0, len(clients)),
		Roles:              make([]string, 0, len(clients)),
		CommunicationTypes: make([]string, 0, len(clients)),
		Descriptions:       make([]string, 0, len(clients)),
	}
	for _, client := range clients {
		params.ClientNames = append(params.ClientNames, string(client.Type().ClientName()))
		params.Roles = append(params.Roles, string(client.Type().Role()))
		params.CommunicationTypes = append(params.CommunicationTypes, string(client.Type().CommunicationType()))
		params.Descriptions = append(params.Descriptions, client.Description())
	}

	rows, err := r.queries.BatchCreateClients(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("batch create clients: %w", mapCreateError(err))
	}
	for _, row := range rows {
		created = append(created, inventory.RestoreComponentClient(
			row.ID,
			inventory.ComponentClientName(row.ClientName),
			inventory.ComponentClientRole(row.Role),
			inventory.CommunicationType(row.CommunicationType),
			stringValue(row.Description),
			row.ApiID,
		))
	}
	sort.Slice(created, func(i, j int) bool { return created[i].ID() < created[j].ID() })
	return created, nil
}

func (r *Repository) CountByComponentID(ctx context.Context, componentID int64) (int, error) {
	count, err := r.queries.CountClientsByComponentID(ctx, componentID)
	if err != nil {
		return 0, fmt.Errorf("count clients by component id: %w", postgres.MapDatabaseError(err))
	}
	return int(count), nil
}

func (r *Repository) ListByComponentIDs(
	ctx context.Context,
	componentIDs []int64,
) (map[int64][]inventory.ComponentClient, error) {
	grouped := make(map[int64][]inventory.ComponentClient, len(componentIDs))
	if len(componentIDs) == 0 {
		return grouped, nil
	}

	rows, err := r.queries.ListClientsByComponentIDs(ctx, componentIDs)
	if err != nil {
		return nil, fmt.Errorf("list clients by component ids: %w", postgres.MapDatabaseError(err))
	}
	for _, row := range rows {
		grouped[row.ComponentID] = append(
			grouped[row.ComponentID],
			inventory.RestoreComponentClient(
				row.ID,
				inventory.ComponentClientName(row.ClientName),
				inventory.ComponentClientRole(row.Role),
				inventory.CommunicationType(row.CommunicationType),
				stringValue(row.Description),
				row.ApiID,
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

func (r *Repository) BindAPI(
	ctx context.Context,
	componentID int64,
	clientID int64,
	apiID int64,
) (inventory.ComponentClient, error) {
	source, err := r.queries.GetClientForAPIUpdate(ctx, sqlc.GetClientForAPIUpdateParams{
		ClientID:    clientID,
		ComponentID: componentID,
	})
	if err != nil {
		return inventory.ComponentClient{}, fmt.Errorf("bind client API: %w", postgres.MapDatabaseError(err))
	}
	if source.ApiID != nil {
		return inventory.ComponentClient{}, fmt.Errorf("bind client API: %w", inventory.ErrClientAlreadyBound)
	}

	target, err := r.queries.GetTargetAPIForShare(ctx, apiID)
	if err != nil {
		return inventory.ComponentClient{}, fmt.Errorf("bind client API: %w", postgres.MapDatabaseError(err))
	}
	if source.ComponentID == target.ComponentID || source.ProductID != target.ProductID {
		return inventory.ComponentClient{}, fmt.Errorf("bind client API: %w", inventory.ErrInvalidClientBinding)
	}

	row, err := r.queries.BindClientAPI(ctx, sqlc.BindClientAPIParams{
		ApiID:    &apiID,
		ClientID: clientID,
	})
	if err != nil {
		return inventory.ComponentClient{}, fmt.Errorf("bind client API: %w", mapBindAPIError(err))
	}
	return inventory.RestoreComponentClient(
		row.ID,
		inventory.ComponentClientName(row.ClientName),
		inventory.ComponentClientRole(row.Role),
		inventory.CommunicationType(row.CommunicationType),
		stringValue(row.Description),
		row.ApiID,
	), nil
}

func mapCreateError(err error) error {
	mapped := postgres.MapDatabaseError(err)
	pgErr, ok := errors.AsType[*pgconn.PgError](err)
	if ok && errors.Is(mapped, postgres.ErrForeignKeyViolation) && pgErr.ConstraintName == componentForeignKey {
		return fmt.Errorf("%w: %w", postgres.ErrNotFound, mapped)
	}
	return mapped
}

func mapBindAPIError(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return inventory.ErrClientAlreadyBound
	}
	mapped := postgres.MapDatabaseError(err)
	if errors.Is(mapped, postgres.ErrForeignKeyViolation) {
		return fmt.Errorf("%w: %w", postgres.ErrNotFound, mapped)
	}
	return mapped
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
