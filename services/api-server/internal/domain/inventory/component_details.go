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

type BackgroundWorkerComponentDetails struct {
	Language        string
	LanguageVersion string
	MainFramework   string
	Broker          EventBrokerType
}

func NewBackgroundWorkerComponentDetails(
	language,
	languageVersion,
	mainFramework string,
	broker EventBrokerType,
) (BackgroundWorkerComponentDetails, error) {
	details := BackgroundWorkerComponentDetails{
		Language:        language,
		LanguageVersion: languageVersion,
		MainFramework:   mainFramework,
		Broker:          broker,
	}
	if err := details.validate(); err != nil {
		return BackgroundWorkerComponentDetails{}, err
	}
	return details, nil
}

func (BackgroundWorkerComponentDetails) componentType() ComponentType {
	return ComponentTypeBackgroundWorker
}

func (d BackgroundWorkerComponentDetails) validate() error {
	if d.Language == "" {
		return ErrInvalidDetails
	}
	if !isValidBroker(d.Broker) {
		return ErrUnknownBroker
	}
	return nil
}

type InfrastructureComponentDetails struct {
	System         string
	Version        string
	NetworkAddress string
}

func NewInfrastructureComponentDetails(
	system,
	version,
	networkAddress string,
) (InfrastructureComponentDetails, error) {
	details := InfrastructureComponentDetails{
		System:         system,
		Version:        version,
		NetworkAddress: networkAddress,
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
	if d.System == "" {
		return ErrInvalidDetails
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

func isValidBroker(broker EventBrokerType) bool {
	switch broker {
	case RabbitMQBroker,
		KafkaBroker,
		RedpandaBroker,
		NATSBroker,
		PulsarBroker,
		SQSBroker,
		GCPBroker,
		AzureServiceBusBroker,
		RedisStreamsBroker,
		ActiveMQBroker,
		IBMMQBroker:
		return true
	}

	return false
}
