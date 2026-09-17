package inventory

type BackendServiceComponentDetails struct {
	Language        string
	LanguageVersion string
	MainFramework   string
}

func NewBackendServiceComponentDetails(
	language,
	languageVersion,
	mainFramework string,
) (BackendServiceComponentDetails, error) {
	details := BackendServiceComponentDetails{
		Language:        language,
		LanguageVersion: languageVersion,
		MainFramework:   mainFramework,
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
	if d.Language == "" {
		return ErrInvalidDetails
	}
	return nil
}

type InfrastructureComponentDetails struct {
	System         string
	SystemType     SystemType
	Version        string
	NetworkAddress []string
}

func NewInfrastructureComponentDetails(
	system string,
	systemType SystemType,
	version string,
	networkAddress []string,
) (InfrastructureComponentDetails, error) {
	addresses := make([]string, len(networkAddress))
	copy(addresses, networkAddress)
	details := InfrastructureComponentDetails{
		System:         system,
		SystemType:     systemType,
		Version:        version,
		NetworkAddress: addresses,
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
	if !isValidSystemType(d.SystemType) {
		return ErrUnknownSystemType
	}
	if d.System == "" {
		return ErrInvalidDetails
	}
	if len(d.NetworkAddress) > 10 {
		return ErrTooManyNetworkAddresses
	}
	return nil
}

type FrontendServiceComponentDetails struct {
	Language        string
	LanguageVersion string
	MainFramework   string
}

func NewFrontendServiceComponentDetails(
	language,
	languageVersion,
	mainFramework string,
) (FrontendServiceComponentDetails, error) {
	details := FrontendServiceComponentDetails{
		Language:        language,
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
	if d.Language == "" {
		return ErrInvalidDetails
	}
	return nil
}

func isValidSystemType(systemType SystemType) bool {
	switch systemType {
	case SystemTypeQueueStream, SystemTypeSQLDatabase, SystemTypeNoSQLDatabase, SystemTypeWorkflowEngine:
		return true
	default:
		return false
	}
}
