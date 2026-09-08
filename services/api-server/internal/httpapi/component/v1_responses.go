package component

import (
	"fmt"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type ResponseV1 struct {
	ID          int64           `json:"id"`
	ProductID   int64           `json:"product_id"`
	Name        string          `json:"name"`
	Type        string          `json:"type"`
	Description string          `json:"description"`
	Details     any             `json:"details"`
	APIs        []APIResponseV1 `json:"apis"`
}

type APIResponseV1 struct {
	ID              int64                     `json:"id"`
	Name            string                    `json:"name"`
	APIType         inventory.APIType         `json:"api_type"`
	NetworkExposure inventory.NetworkExposure `json:"network_exposure"`
	Role            inventory.APIRole         `json:"role"`
}

type ServiceDetailsResponseV1 struct {
	Language        string `json:"language"`
	LanguageVersion string `json:"language_version"`
	Framework       string `json:"framework"`
}

type BackgroundWorkerDetailsResponseV1 struct {
	Language        string                    `json:"language"`
	LanguageVersion string                    `json:"language_version"`
	Framework       string                    `json:"framework"`
	Broker          inventory.EventBrokerType `json:"broker"`
}

type InfrastructureDetailsResponseV1 struct {
	System         string `json:"system"`
	Version        string `json:"version"`
	NetworkAddress string `json:"network_address"`
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
			ID:              componentAPI.API.ID(),
			Name:            componentAPI.API.Name(),
			APIType:         componentAPI.API.APIType(),
			NetworkExposure: componentAPI.API.Exposure(),
			Role:            componentAPI.Role,
		})
	}
	return ResponseV1{
		ID:          component.ID(),
		ProductID:   component.ProductID(),
		Name:        component.Name(),
		Type:        string(component.Type()),
		Description: component.Description(),
		Details:     details,
		APIs:        apis,
	}, nil
}

func newDetailsResponseV1(details inventory.ComponentDetails) (any, error) {
	switch details := details.(type) {
	case inventory.BackendServiceComponentDetails:
		return ServiceDetailsResponseV1{Language: details.Language, LanguageVersion: details.LanguageVersion, Framework: details.MainFramework}, nil
	case inventory.FrontendServiceComponentDetails:
		return ServiceDetailsResponseV1{Language: details.Language, LanguageVersion: details.LanguageVersion, Framework: details.MainFramework}, nil
	case inventory.BackgroundWorkerComponentDetails:
		return BackgroundWorkerDetailsResponseV1{Language: details.Language, LanguageVersion: details.LanguageVersion, Framework: details.MainFramework, Broker: details.Broker}, nil
	case inventory.InfrastructureComponentDetails:
		return InfrastructureDetailsResponseV1{
			System:         details.System,
			Version:        details.Version,
			NetworkAddress: details.NetworkAddress,
		}, nil
	default:
		return nil, fmt.Errorf("%w: unsupported details type %T", inventory.ErrInvalidDetails, details)
	}
}
