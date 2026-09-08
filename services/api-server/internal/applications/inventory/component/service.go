package component

import (
	"context"
	"fmt"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type Store interface {
	Create(ctx context.Context, component inventory.Component) (inventory.Component, error)
	GetByID(ctx context.Context, id int64) (inventory.Component, error)
	ListByProduct(ctx context.Context, productID int64, limit int, offset int) ([]inventory.Component, error)
	Delete(ctx context.Context, id int64) error
	GetAPIProviderComponentID(ctx context.Context, apiID int64) (int64, error)
	AddConsumerAPI(ctx context.Context, componentID, apiID int64) error
	RemoveConsumerAPI(ctx context.Context, componentID, apiID int64) error
}

type service struct {
	store Store
}

func newService(store Store) *service {
	return &service{store: store}
}

func (s *service) create(ctx context.Context, command CreateInput) (inventory.Component, error) {
	details, err := newDomainDetails(command.Details)
	if err != nil {
		return inventory.Component{}, fmt.Errorf("creating component details: %w", err)
	}

	apis := make([]inventory.API, 0, len(command.APIs))
	for _, api := range command.APIs {
		domainAPI, err := inventory.NewAPI(api.Name, api.APIType, api.Exposure)
		if err != nil {
			return inventory.Component{}, fmt.Errorf("creating domain api: %w", err)
		}
		apis = append(apis, domainAPI)
	}

	component, err := inventory.NewComponent(
		command.ProductID,
		command.Name,
		command.Description,
		command.ComponentType,
		details,
		apis,
	)
	if err != nil {
		return inventory.Component{}, fmt.Errorf("creating domain component: %w", err)
	}

	createdComponent, err := s.store.Create(ctx, component)
	if err != nil {
		return inventory.Component{}, fmt.Errorf("creating component: %w", err)
	}
	return createdComponent, nil
}

func (s *service) get(ctx context.Context, id int64) (inventory.Component, error) {
	component, err := s.store.GetByID(ctx, id)
	if err != nil {
		return inventory.Component{}, fmt.Errorf("getting component: %w", err)
	}

	return component, nil
}

func (s *service) listByProduct(
	ctx context.Context,
	productID int64,
	limit int,
	offset int,
) ([]inventory.Component, error) {
	components, err := s.store.ListByProduct(
		ctx,
		productID,
		limit,
		offset,
	)
	if err != nil {
		return nil, fmt.Errorf("listing components: %w", err)
	}

	return components, nil
}

func (s *service) delete(ctx context.Context, id int64) error {
	if err := s.store.Delete(ctx, id); err != nil {
		return fmt.Errorf("deleting component: %w", err)
	}

	return nil
}

func (s *service) addConsumerAPI(ctx context.Context, componentID, apiID int64) error {
	if componentID <= 0 || apiID <= 0 {
		return inventory.ErrNegativeID
	}

	if _, err := s.store.GetByID(ctx, componentID); err != nil {
		return fmt.Errorf("getting consumer component: %w", err)
	}
	providerComponentID, err := s.store.GetAPIProviderComponentID(ctx, apiID)
	if err != nil {
		return fmt.Errorf("getting api provider component: %w", err)
	}
	if providerComponentID == componentID {
		return inventory.ErrConsumerAPIHasSameProvider
	}
	if err := s.store.AddConsumerAPI(ctx, componentID, apiID); err != nil {
		return fmt.Errorf("adding consumer api: %w", err)
	}

	return nil
}

func (s *service) removeConsumerAPI(ctx context.Context, componentID, apiID int64) error {
	if componentID <= 0 || apiID <= 0 {
		return inventory.ErrNegativeID
	}

	if err := s.store.RemoveConsumerAPI(ctx, componentID, apiID); err != nil {
		return fmt.Errorf("removing consumer api: %w", err)
	}

	return nil
}

func newDomainDetails(input Details) (inventory.ComponentDetails, error) {
	switch details := input.(type) {
	case BackendServiceDetails:
		return inventory.NewBackendServiceComponentDetails(
			details.CoreLanguage,
			details.LanguageVersion,
			details.MainFramework,
		)
	case FrontendServiceDetails:
		return inventory.NewFrontendServiceComponentDetails(
			details.CoreLanguage,
			details.LanguageVersion,
			details.MainFramework,
		)
	case BackgroundWorkerDetails:
		return inventory.NewBackgroundWorkerComponentDetails(
			details.CoreLanguage,
			details.LanguageVersion,
			details.MainFramework,
			details.Broker,
		)
	case InfrastructureDetails:
		return inventory.NewInfrastructureComponentDetails(
			details.System,
			details.Version,
			details.NetworkAddress,
		)
	case nil:
		return nil, nil
	default:
		return nil, inventory.ErrInvalidDetails
	}
}
