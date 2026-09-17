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

type InfrastructureDetails struct {
	System         string
	Version        string
	SystemType     inventory.SystemType
	NetworkAddress []string
}

func (InfrastructureDetails) isComponentDetails() {}

type CreateCommand struct {
	ProductID     int64
	Name          string
	Description   string
	ComponentType inventory.ComponentType
	Details       Details
	APIs          []CreateAPICommand
	Clients       []CreateClientCommand
}

type CreateAPICommand struct {
	Name            string
	APIType         inventory.APIType
	NetworkExposure inventory.NetworkExposure
}

type CreateClientCommand struct {
	ClientName        inventory.ComponentClientName
	Role              inventory.ComponentClientRole
	CommunicationType inventory.CommunicationType
	Description       string
}
