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
	Technology InfrastructureTechnology
	SystemType SystemType
	Version    string
	Endpoints  []string
}

func NewInfrastructureComponentDetails(
	technology InfrastructureTechnology,
	systemType SystemType,
	version string,
	endpoints []string,
) (InfrastructureComponentDetails, error) {
	copiedEndpoints := make([]string, len(endpoints))
	copy(copiedEndpoints, endpoints)
	details := InfrastructureComponentDetails{
		Technology: technology,
		SystemType: systemType,
		Version:    version,
		Endpoints:  copiedEndpoints,
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
	if !isValidInfrastructureTechnology(d.Technology) {
		return ErrUnknownInfrastructureTechnology
	}
	if !isValidSystemType(d.SystemType) {
		return ErrUnknownSystemType
	}
	if len(d.Endpoints) > 10 {
		return ErrTooManyEndpoints
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

func isValidInfrastructureTechnology(technology InfrastructureTechnology) bool {
	switch technology {
	case InfrastructureTechnologyPostgreSQL,
		InfrastructureTechnologyMySQL,
		InfrastructureTechnologyMariaDB,
		InfrastructureTechnologyMongoDB,
		InfrastructureTechnologyCassandra,
		InfrastructureTechnologyClickHouse,
		InfrastructureTechnologyRedis,
		InfrastructureTechnologyMemcached,
		InfrastructureTechnologyEtcd,
		InfrastructureTechnologyKafka,
		InfrastructureTechnologyRabbitMQ,
		InfrastructureTechnologyNATS,
		InfrastructureTechnologyPulsar,
		InfrastructureTechnologyElasticsearch,
		InfrastructureTechnologyOpenSearch,
		InfrastructureTechnologyS3,
		InfrastructureTechnologyMinIO,
		InfrastructureTechnologyCeph,
		InfrastructureTechnologyTemporal,
		InfrastructureTechnologyAirflow,
		InfrastructureTechnologyArgo,
		InfrastructureTechnologyNginx,
		InfrastructureTechnologyEnvoy,
		InfrastructureTechnologyKong,
		InfrastructureTechnologyTraefik,
		InfrastructureTechnologyHAProxy,
		InfrastructureTechnologyPrometheus,
		InfrastructureTechnologyGrafana,
		InfrastructureTechnologyZabbix,
		InfrastructureTechnologyJaeger,
		InfrastructureTechnologyZipkin,
		InfrastructureTechnologyOpenTelemetry,
		InfrastructureTechnologyKeycloak,
		InfrastructureTechnologyVault:
		return true
	default:
		return false
	}
}

func isValidSystemType(systemType SystemType) bool {
	switch systemType {
	case SystemTypeMessageBroker,
		SystemTypeSQLDatabase,
		SystemTypeNoSQLDatabase,
		SystemTypeCache,
		SystemTypeSearchEngine,
		SystemTypeObjectStorage,
		SystemTypeWorkflowEngine,
		SystemTypeServiceMesh,
		SystemTypeAPIGateway,
		SystemTypeLoadBalancer,
		SystemTypeIdentityProvider,
		SystemTypeSecretStorage,
		SystemTypeMonitoring,
		SystemTypeLogging,
		SystemTypeTracing:
		return true
	default:
		return false
	}
}
