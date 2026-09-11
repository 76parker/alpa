package component

import "github.com/76parker/alpa/internal/domain/inventory"

type Details interface {
	isComponentDetails()
}

type BackendServiceDetails struct {
	CoreLanguage    string
	LanguageVersion string
	MainFramework   string
}

func (BackendServiceDetails) isComponentDetails() {}

type FrontendServiceDetails struct {
	CoreLanguage    string
	LanguageVersion string
	MainFramework   string
}

func (FrontendServiceDetails) isComponentDetails() {}

type BackgroundWorkerDetails struct {
	CoreLanguage    string
	LanguageVersion string
	MainFramework   string
	Broker          inventory.EventBrokerType
}

func (BackgroundWorkerDetails) isComponentDetails() {}

type InfrastructureDetails struct {
	System         string
	Version        string
	SystemType     inventory.SystemType
	NetworkAddress []string
}

func (InfrastructureDetails) isComponentDetails() {}

type CreateInput struct {
	ProductID     int64
	Name          string
	Description   string
	APIs          []APIInput
	ComponentType inventory.ComponentType
	Details       Details
}

type APIInput struct {
	Name     string
	APIType  inventory.APIType
	Exposure inventory.NetworkExposure
}
