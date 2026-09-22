package component

import (
	"fmt"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type ResponseV1 struct {
	ID          int64              `json:"id"`
	ProductID   int64              `json:"product_id"`
	Name        string             `json:"name"`
	Type        string             `json:"type"`
	Description string             `json:"description"`
	Details     any                `json:"details"`
	APIs        []APIResponseV1    `json:"apis"`
	Clients     []ClientResponseV1 `json:"clients"`
}

type APIResponseV1 struct {
	ID              int64                     `json:"id"`
	Name            string                    `json:"name"`
	APIType         inventory.APIType         `json:"api_type"`
	NetworkExposure inventory.NetworkExposure `json:"network_exposure"`
}

type ClientResponseV1 struct {
	ID                int64                         `json:"id"`
	ClientName        inventory.ComponentClientName `json:"client_name"`
	CommunicationType inventory.CommunicationType   `json:"communication_type"`
	Capabilities      *string                       `json:"capabilities"`
	SecureConnection  bool                          `json:"secure_connection"`
	Integrations      []IntegrationResponseV1       `json:"integrations"`
}

type IntegrationResponseV1 struct {
	ID          int64                  `json:"id"`
	ClientID    int64                  `json:"client_id"`
	APIID       int64                  `json:"api_id"`
	Action      inventory.ClientAction `json:"action"`
	Description *string                `json:"description"`
}

type BackendServiceDetailsResponseV1 struct {
	Language      inventory.Language `json:"language"`
	RepositoryURL *string            `json:"repository_url"`
}

type FrontendServiceDetailsResponseV1 struct {
	Language        inventory.Language `json:"language"`
	LanguageVersion string             `json:"language_version"`
	Framework       string             `json:"framework"`
}

type InfrastructureDetailsResponseV1 struct {
	TechnologyName inventory.TechnologyName            `json:"technology_name"`
	Version        string                              `json:"version"`
	TechnologyType inventory.TechnologyType            `json:"technology_type"`
	Importancy     inventory.InfrastructureCriticality `json:"importancy"`
	Endpoints      []string                            `json:"endpoints"`
}

func NewResponseV1(component inventory.Component) (ResponseV1, error) {
	details, err := newDetailsResponseV1(component.Details())
	if err != nil {
		return ResponseV1{}, err
	}
	componentAPIs := component.APIs()
	apis := make([]APIResponseV1, 0, len(componentAPIs))
	for _, componentAPI := range componentAPIs {
		apis = append(apis, APIResponseV1{
			ID:              componentAPI.ID(),
			Name:            componentAPI.Name(),
			APIType:         componentAPI.APIType(),
			NetworkExposure: componentAPI.Exposure(),
		})
	}
	clients := make([]ClientResponseV1, 0, len(component.Clients()))
	for _, componentClient := range component.Clients() {
		componentIntegrations := componentClient.Integrations()
		integrations := make([]IntegrationResponseV1, 0, len(componentIntegrations))
		for _, integration := range componentIntegrations {
			integrations = append(integrations, IntegrationResponseV1{
				ID:          integration.ID(),
				ClientID:    integration.ClientID(),
				APIID:       integration.APIID(),
				Action:      integration.Action(),
				Description: integration.Description(),
			})
		}
		response := ClientResponseV1{
			ID:                componentClient.ID(),
			ClientName:        componentClient.Type().ClientName(),
			CommunicationType: componentClient.Type().CommunicationType(),
			Capabilities:      componentClient.Capabilities(),
			SecureConnection:  componentClient.SecureConnection(),
			Integrations:      integrations,
		}
		clients = append(clients, response)
	}
	return ResponseV1{
		ID:          component.ID(),
		ProductID:   component.ProductID(),
		Name:        component.Name(),
		Type:        string(component.Type()),
		Description: component.Description(),
		Details:     details,
		APIs:        apis,
		Clients:     clients,
	}, nil
}

func newDetailsResponseV1(details inventory.ComponentDetails) (any, error) {
	switch details := details.(type) {
	case inventory.BackendServiceComponentDetails:
		return BackendServiceDetailsResponseV1{Language: details.Language, RepositoryURL: details.RepositoryURL}, nil
	case inventory.FrontendServiceComponentDetails:
		return FrontendServiceDetailsResponseV1{Language: details.Language, LanguageVersion: details.LanguageVersion, Framework: details.MainFramework}, nil
	case inventory.InfrastructureComponentDetails:
		return InfrastructureDetailsResponseV1{
			TechnologyName: details.TechnologyName,
			TechnologyType: details.TechnologyType,
			Importancy:     details.Importancy,
			Version:        details.Version,
			Endpoints:      append([]string{}, details.Endpoints...),
		}, nil
	default:
		return nil, fmt.Errorf("%w: unsupported details type %T", inventory.ErrInvalidDetails, details)
	}
}
