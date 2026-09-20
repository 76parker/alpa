package component

import "github.com/76parker/alpa/internal/domain/inventory"

type Details interface {
	isComponentDetails()
}

type BackendServiceDetails struct {
	CoreLanguage  inventory.Language
	RepositoryURL *string
}

func (BackendServiceDetails) isComponentDetails() {}

type FrontendServiceDetails struct {
	CoreLanguage    inventory.Language
	LanguageVersion string
	MainFramework   string
}

func (FrontendServiceDetails) isComponentDetails() {}

type InfrastructureDetails struct {
	TechnologyName inventory.TechnologyName
	Version        string
	TechnologyType inventory.TechnologyType
	Importancy     inventory.InfrastructureCriticality
	Endpoints      []string
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
	Name             string
	APIType          inventory.APIType
	NetworkExposure  inventory.NetworkExposure
	DocumentationURL *string
}

type CreateClientCommand struct {
	ClientName       inventory.ComponentClientName
	Role             inventory.ComponentClientRole
	Action           *string
	Capabilities     *string
	SecureConnection bool
}
