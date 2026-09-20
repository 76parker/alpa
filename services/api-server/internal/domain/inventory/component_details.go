package inventory

type BackendServiceComponentDetails struct {
	Language      Language
	RepositoryURL *string
}

func NewBackendServiceComponentDetails(
	language Language,
	repositoryURL *string,
) (BackendServiceComponentDetails, error) {
	canonicalLanguage, err := NewLanguage(string(language))
	if err != nil {
		return BackendServiceComponentDetails{}, err
	}
	details := BackendServiceComponentDetails{
		Language:      canonicalLanguage,
		RepositoryURL: repositoryURL,
	}
	if err := details.validate(); err != nil {
		return BackendServiceComponentDetails{}, err
	}
	return details, nil
}

func (BackendServiceComponentDetails) componentType() ComponentType {
	return ComponentTypeBackend
}

func (d BackendServiceComponentDetails) validate() error {
	if !isValidLanguage(d.Language) {
		return ErrUnknownLanguage
	}
	return nil
}

type InfrastructureComponentDetails struct {
	TechnologyName TechnologyName
	TechnologyType TechnologyType
	Importancy     InfrastructureCriticality
	Version        string
	Endpoints      []string
}

func NewInfrastructureComponentDetails(
	technologyName TechnologyName,
	technologyType TechnologyType,
	importancy InfrastructureCriticality,
	version string,
	endpoints []string,
) (InfrastructureComponentDetails, error) {
	copiedEndpoints := make([]string, len(endpoints))
	copy(copiedEndpoints, endpoints)
	details := InfrastructureComponentDetails{
		TechnologyName: technologyName,
		TechnologyType: technologyType,
		Importancy:     importancy,
		Version:        version,
		Endpoints:      copiedEndpoints,
	}
	if err := details.validate(); err != nil {
		return InfrastructureComponentDetails{}, err
	}
	return details, nil
}

func (InfrastructureComponentDetails) componentType() ComponentType {
	return ComponentTypeInfrastructure
}

func (d InfrastructureComponentDetails) validate() error {
	if !isValidTechnologyType(d.TechnologyType) {
		return ErrUnknownTechnologyType
	}
	if !isValidInfrastructureCriticality(d.Importancy) {
		return ErrInvalidInfrastructureCriticality
	}
	defaultParameters, ok := resolveDefaultTechnologyParameters[d.TechnologyName]
	if !ok {
		return ErrUnknownTechnologyName
	}
	if defaultParameters.TechnologyType != d.TechnologyType {
		return ErrUnknownTechnologyType
	}

	if len(d.Endpoints) > 10 {
		return ErrTooManyEndpoints
	}
	return nil
}

type FrontendServiceComponentDetails struct {
	Language        Language
	LanguageVersion string
	MainFramework   string
}

func NewFrontendServiceComponentDetails(
	language Language,
	languageVersion,
	mainFramework string,
) (FrontendServiceComponentDetails, error) {
	canonicalLanguage, err := NewLanguage(string(language))
	if err != nil {
		return FrontendServiceComponentDetails{}, err
	}
	details := FrontendServiceComponentDetails{
		Language:        canonicalLanguage,
		LanguageVersion: languageVersion,
		MainFramework:   mainFramework,
	}
	if err := details.validate(); err != nil {
		return FrontendServiceComponentDetails{}, err
	}
	return details, nil
}

func (FrontendServiceComponentDetails) componentType() ComponentType {
	return ComponentTypeFrontend
}

func (d FrontendServiceComponentDetails) validate() error {
	if !isValidLanguage(d.Language) {
		return ErrUnknownLanguage
	}
	return nil
}

func isValidTechnologyType(technologyType TechnologyType) bool {
	switch technologyType {
	case MessageBroker,
		SQLDatabase,
		NoSQLDatabase,
		Cache,
		SearchEngine,
		ObjectStorage,
		WorkflowEngine,
		ServiceMesh,
		APIGateway,
		LoadBalancer,
		IdentityProvider,
		SecretStorage,
		Monitoring,
		Logging,
		Tracing:
		return true
	default:
		return false
	}
}
