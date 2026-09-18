package component

import (
	"context"
	"fmt"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type Store interface {
	GetByID(ctx context.Context, componentID int64) (inventory.Component, error)
	ListByProduct(ctx context.Context, productID int64, limit int, offset int) ([]inventory.Component, error)
	Create(ctx context.Context, component inventory.Component) (inventory.Component, error)
	Delete(ctx context.Context, componentID int64) error
}

type service struct {
	store     Store
	txManager TxManager
}

func newService(store Store, txManager TxManager) *service {
	return &service{store: store, txManager: txManager}
}

func (s *service) create(ctx context.Context, command CreateCommand) (inventory.Component, error) {
	if len(command.APIs) > maxChildrenPerComponent {
		return inventory.Component{}, inventory.ErrAPILimitExceeded
	}
	if len(command.Clients) > maxChildrenPerComponent {
		return inventory.Component{}, inventory.ErrClientLimitExceeded
	}
	details, err := newDomainDetails(command.Details)
	if err != nil {
		return inventory.Component{}, fmt.Errorf("creating component details: %w", err)
	}
	component, err := inventory.NewComponent(
		command.ProductID,
		command.Name,
		command.Description,
		command.ComponentType,
		details,
	)
	if err != nil {
		return inventory.Component{}, fmt.Errorf("creating domain component: %w", err)
	}
	apis, err := newDomainAPIs(command.APIs)
	if err != nil {
		return inventory.Component{}, fmt.Errorf("creating component APIs: %w", err)
	}
	clients, err := newDomainClients(command.Clients)
	if err != nil {
		return inventory.Component{}, fmt.Errorf("creating component clients: %w", err)
	}

	var created inventory.Component
	err = s.txManager.ExecuteWriteComponentTx(ctx, func(stores TxStores) error {
		createdComponent, err := stores.Components.Create(ctx, component)
		if err != nil {
			return fmt.Errorf("creating component: %w", err)
		}
		createdAPIs, err := stores.APIs.BatchCreate(ctx, createdComponent.ID(), apis)
		if err != nil {
			return fmt.Errorf("creating component APIs: %w", err)
		}
		createdClients, err := stores.Clients.BatchCreate(ctx, createdComponent.ID(), clients)
		if err != nil {
			return fmt.Errorf("creating component clients: %w", err)
		}
		createdComponent.WithAPIs(createdAPIs)
		createdComponent.WithClients(createdClients)
		created = createdComponent
		return nil
	})
	if err != nil {
		return inventory.Component{}, err
	}
	return created, nil
}

func newDomainAPIs(commands []CreateAPICommand) ([]inventory.ComponentAPI, error) {
	apis := make([]inventory.ComponentAPI, 0, len(commands))
	for _, command := range commands {
		api, err := inventory.NewComponentAPI(command.Name, command.APIType, command.NetworkExposure)
		if err != nil {
			return nil, err
		}
		apis = append(apis, api)
	}
	return apis, nil
}

func newDomainClients(commands []CreateClientCommand) ([]inventory.ComponentClient, error) {
	clients := make([]inventory.ComponentClient, 0, len(commands))
	for _, command := range commands {
		client, err := inventory.NewComponentClient(
			command.ClientName,
			command.Role,
			command.CommunicationType,
			command.Description,
		)
		if err != nil {
			return nil, err
		}
		clients = append(clients, client)
	}
	return clients, nil
}

func (s *service) get(ctx context.Context, id int64) (inventory.Component, error) {
	if id <= 0 {
		return inventory.Component{}, inventory.ErrNegativeID
	}
	var component inventory.Component
	txFunc := func(stores TxStores) error {
		loadedComponent, err := stores.Components.GetByID(ctx, id)
		if err != nil {
			return fmt.Errorf("getting component in tx: %w", err)
		}
		componentID := loadedComponent.ID()
		loadedAPIs, err := stores.APIs.ListByComponentIDs(ctx, []int64{componentID})
		if err != nil {
			return fmt.Errorf("getting component APIs in tx: %w", err)
		}
		loadedClients, err := stores.Clients.ListByComponentIDs(ctx, []int64{componentID})
		if err != nil {
			return fmt.Errorf("getting component clients in tx: %w", err)
		}
		loadedComponent.WithAPIs(loadedAPIs[componentID])
		loadedComponent.WithClients(loadedClients[componentID])
		component = loadedComponent
		return nil
	}
	if err := s.txManager.ExecuteReadComponentTx(ctx, txFunc); err != nil {
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
	if productID <= 0 {
		return nil, inventory.ErrNegativeID
	}
	components := make([]inventory.Component, 0, defaultSliceReservation)
	txFunc := func(stores TxStores) error {
		loadedComponents, err := stores.Components.ListByProduct(ctx, productID, limit, offset)
		if err != nil {
			return fmt.Errorf("listing components in tx: %w", err)
		}
		if len(loadedComponents) == 0 {
			return nil
		}
		componentIDs := make([]int64, 0, len(loadedComponents))
		for _, component := range loadedComponents {
			componentIDs = append(componentIDs, component.ID())
		}
		loadedAPIs, err := stores.APIs.ListByComponentIDs(ctx, componentIDs)
		if err != nil {
			return fmt.Errorf("listing APIs in tx: %w", err)
		}
		loadedClients, err := stores.Clients.ListByComponentIDs(ctx, componentIDs)
		if err != nil {
			return fmt.Errorf("listing clients in tx: %w", err)
		}
		for _, component := range loadedComponents {
			component.WithAPIs(loadedAPIs[component.ID()])
			component.WithClients(loadedClients[component.ID()])
			components = append(components, component)
		}
		return nil
	}

	if err := s.txManager.ExecuteReadComponentTx(ctx, txFunc); err != nil {
		return nil, fmt.Errorf("listing components tx: %w", err)
	}
	return components, nil
}

func (s *service) delete(ctx context.Context, id int64) error {
	if id <= 0 {
		return inventory.ErrNegativeID
	}
	if err := s.store.Delete(ctx, id); err != nil {
		return fmt.Errorf("deleting component: %w", err)
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
	case InfrastructureDetails:
		return inventory.NewInfrastructureComponentDetails(
			details.Technology,
			details.SystemType,
			details.Version,
			details.Endpoints,
		)
	case nil:
		return nil, nil
	default:
		return nil, inventory.ErrInvalidDetails
	}
}
