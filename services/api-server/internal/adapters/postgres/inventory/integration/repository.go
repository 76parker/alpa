package integration

import (
	"context"
	"errors"
	"fmt"

	postgres "github.com/76parker/alpa/internal/adapters/postgres"
	"github.com/76parker/alpa/internal/adapters/postgres/internal/sqlc"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/jackc/pgx/v5/pgconn"
)

const uniqueIntegrationConstraint = "component_client_unique_integration_idx"

type Repository struct {
	queries *sqlc.Queries
}

func NewRepository(db postgres.DBTX) *Repository {
	return &Repository{queries: sqlc.New(db)}
}

func (r *Repository) GetClientForShare(
	ctx context.Context,
	clientID int64,
) (inventory.ComponentClient, int64, int64, error) {
	row, err := r.queries.GetIntegrationClientForShare(ctx, clientID)
	if err != nil {
		return inventory.ComponentClient{}, 0, 0, fmt.Errorf(
			"get integration client: %w",
			postgres.MapDatabaseError(err),
		)
	}
	client := inventory.RestoreComponentClient(
		row.ID,
		inventory.ComponentClientName(row.ClientName),
		row.Capabilities,
		row.SecureConnection,
	)
	return client, row.ComponentID, row.ProductID, nil
}

func (r *Repository) GetAPIForShare(ctx context.Context, apiID int64) (int64, int64, error) {
	row, err := r.queries.GetIntegrationAPIForShare(ctx, apiID)
	if err != nil {
		return 0, 0, fmt.Errorf("get integration api: %w", postgres.MapDatabaseError(err))
	}
	return row.ComponentID, row.ProductID, nil
}

func (r *Repository) Create(
	ctx context.Context,
	integration inventory.Integration,
) (inventory.Integration, error) {
	row, err := r.queries.CreateIntegration(ctx, sqlc.CreateIntegrationParams{
		ClientID:    integration.ClientID(),
		ApiID:       integration.APIID(),
		Action:      string(integration.Action()),
		Description: integration.Description(),
	})
	if err != nil {
		return inventory.Integration{}, fmt.Errorf("create integration: %w", mapCreateError(err))
	}
	return integrationFromRow(row), nil
}

func (r *Repository) GetForUpdate(ctx context.Context, integrationID int64) (inventory.Integration, error) {
	row, err := r.queries.GetIntegrationForUpdate(ctx, integrationID)
	if err != nil {
		return inventory.Integration{}, fmt.Errorf(
			"get integration for update: %w",
			postgres.MapDatabaseError(err),
		)
	}
	return integrationFromRow(row), nil
}

func (r *Repository) Update(
	ctx context.Context,
	integration inventory.Integration,
) (inventory.Integration, error) {
	row, err := r.queries.UpdateIntegrationDescription(ctx, sqlc.UpdateIntegrationDescriptionParams{
		Description:   integration.Description(),
		IntegrationID: integration.ID(),
	})
	if err != nil {
		return inventory.Integration{}, fmt.Errorf(
			"update integration: %w",
			postgres.MapDatabaseError(err),
		)
	}
	return integrationFromRow(row), nil
}

func (r *Repository) Delete(ctx context.Context, integrationID int64) error {
	if _, err := r.queries.DeleteIntegration(ctx, integrationID); err != nil {
		return fmt.Errorf("delete integration: %w", postgres.MapDatabaseError(err))
	}
	return nil
}

func (r *Repository) ListByClientIDs(
	ctx context.Context,
	clientIDs []int64,
) (map[int64][]inventory.Integration, error) {
	grouped := make(map[int64][]inventory.Integration, len(clientIDs))
	if len(clientIDs) == 0 {
		return grouped, nil
	}
	rows, err := r.queries.ListIntegrationsByClientIDs(ctx, clientIDs)
	if err != nil {
		return nil, fmt.Errorf("list integrations by client ids: %w", postgres.MapDatabaseError(err))
	}
	for _, row := range rows {
		grouped[row.ClientID] = append(grouped[row.ClientID], integrationFromRow(row))
	}
	return grouped, nil
}

func integrationFromRow(row sqlc.InventoryClientIntegration) inventory.Integration {
	return inventory.RestoreIntegration(
		row.ID,
		row.ClientID,
		row.ApiID,
		inventory.ClientAction(row.Action),
		row.Description,
	)
}

func mapCreateError(err error) error {
	mapped := postgres.MapDatabaseError(err)
	pgErr, ok := errors.AsType[*pgconn.PgError](err)
	if ok && errors.Is(mapped, postgres.ErrUniqueViolation) && pgErr.ConstraintName == uniqueIntegrationConstraint {
		return inventory.ErrIntegrationAlreadyExists
	}
	return mapped
}
