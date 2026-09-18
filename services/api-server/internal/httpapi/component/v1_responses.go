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
	Role              inventory.ComponentClientRole `json:"role"`
	CommunicationType inventory.CommunicationType   `json:"communication_type"`
	Description       string                        `json:"description"`
	APIID             *int64                        `json:"api_id"`
}

type ServiceDetailsResponseV1 struct {
	Language        string `json:"language"`
	LanguageVersion string `json:"language_version"`
	Framework       string `json:"framework"`
}

type InfrastructureDetailsResponseV1 struct {
	Technology inventory.InfrastructureTechnology `json:"technology"`
	Version    string                             `json:"version"`
	SystemType inventory.SystemType               `json:"system_type"`
	Endpoints  []string                           `json:"endpoints"`
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
		response := ClientResponseV1{
			ID:                componentClient.ID(),
			ClientName:        componentClient.Type().ClientName(),
			Role:              componentClient.Type().Role(),
			CommunicationType: componentClient.Type().CommunicationType(),
			Description:       componentClient.Description(),
		}
		if apiID := componentClient.APIID(); apiID != nil {
			response.APIID = apiID
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
		return ServiceDetailsResponseV1{Language: details.Language, LanguageVersion: details.LanguageVersion, Framework: details.MainFramework}, nil
	case inventory.FrontendServiceComponentDetails:
		return ServiceDetailsResponseV1{Language: details.Language, LanguageVersion: details.LanguageVersion, Framework: details.MainFramework}, nil
	case inventory.InfrastructureComponentDetails:
		return InfrastructureDetailsResponseV1{
			Technology: details.Technology,
			SystemType: details.SystemType,
			Version:    details.Version,
			Endpoints:  append([]string{}, details.Endpoints...),
		}, nil
	default:
		return nil, fmt.Errorf("%w: unsupported details type %T", inventory.ErrInvalidDetails, details)
	}
}
