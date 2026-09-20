package inventory

type DefaultTechnologyParameters struct {
	TechnologyType TechnologyType
	APIType        APIType
}

var (
	PostgreSQLParameters = DefaultTechnologyParameters{TechnologyType: SQLDatabase, APIType: Database}
	MySQLParameters      = DefaultTechnologyParameters{TechnologyType: SQLDatabase, APIType: Database}
	MariaDBParameters    = DefaultTechnologyParameters{TechnologyType: SQLDatabase, APIType: Database}
	MongoDBParameters    = DefaultTechnologyParameters{TechnologyType: NoSQLDatabase, APIType: Database}
	CassandraParameters  = DefaultTechnologyParameters{TechnologyType: NoSQLDatabase, APIType: Database}
	ClickHouseParameters = DefaultTechnologyParameters{TechnologyType: SQLDatabase, APIType: Database}

	RedisParameters     = DefaultTechnologyParameters{TechnologyType: Cache, APIType: Database}
	MemcachedParameters = DefaultTechnologyParameters{TechnologyType: Cache, APIType: Database}
	EtcdParameters      = DefaultTechnologyParameters{TechnologyType: NoSQLDatabase, APIType: GRPC}

	KafkaParameters    = DefaultTechnologyParameters{TechnologyType: MessageBroker, APIType: Topic}
	RabbitMQParameters = DefaultTechnologyParameters{TechnologyType: MessageBroker, APIType: Exchange}
	NATSParameters     = DefaultTechnologyParameters{TechnologyType: MessageBroker, APIType: Subject}
	PulsarParameters   = DefaultTechnologyParameters{TechnologyType: MessageBroker, APIType: Topic}

	ElasticsearchParameters = DefaultTechnologyParameters{TechnologyType: SearchEngine, APIType: REST}
	OpenSearchParameters    = DefaultTechnologyParameters{TechnologyType: SearchEngine, APIType: REST}

	S3Parameters    = DefaultTechnologyParameters{TechnologyType: ObjectStorage, APIType: REST}
	MinIOParameters = DefaultTechnologyParameters{TechnologyType: ObjectStorage, APIType: REST}
	CephParameters  = DefaultTechnologyParameters{TechnologyType: ObjectStorage, APIType: REST}

	TemporalParameters = DefaultTechnologyParameters{TechnologyType: WorkflowEngine, APIType: GRPC}
	AirflowParameters  = DefaultTechnologyParameters{TechnologyType: WorkflowEngine, APIType: REST}
	ArgoParameters     = DefaultTechnologyParameters{TechnologyType: WorkflowEngine, APIType: REST}

	NginxParameters   = DefaultTechnologyParameters{TechnologyType: LoadBalancer, APIType: REST}
	EnvoyParameters   = DefaultTechnologyParameters{TechnologyType: ServiceMesh, APIType: GRPC}
	KongParameters    = DefaultTechnologyParameters{TechnologyType: APIGateway, APIType: REST}
	TraefikParameters = DefaultTechnologyParameters{TechnologyType: APIGateway, APIType: REST}
	HAProxyParameters = DefaultTechnologyParameters{TechnologyType: LoadBalancer, APIType: REST}

	PrometheusParameters = DefaultTechnologyParameters{TechnologyType: Monitoring, APIType: REST}
	GrafanaParameters    = DefaultTechnologyParameters{TechnologyType: Monitoring, APIType: REST}
	ZabbixParameters     = DefaultTechnologyParameters{TechnologyType: Monitoring, APIType: JSONRPC}

	JaegerParameters        = DefaultTechnologyParameters{TechnologyType: Tracing, APIType: GRPC}
	ZipkinParameters        = DefaultTechnologyParameters{TechnologyType: Tracing, APIType: REST}
	OpenTelemetryParameters = DefaultTechnologyParameters{TechnologyType: Tracing, APIType: GRPC}

	KeycloakParameters = DefaultTechnologyParameters{TechnologyType: IdentityProvider, APIType: REST}
	VaultParameters    = DefaultTechnologyParameters{TechnologyType: SecretStorage, APIType: REST}
)

var resolveDefaultTechnologyParameters = map[TechnologyName]DefaultTechnologyParameters{
	PostgreSQL:    PostgreSQLParameters,
	MySQL:         MySQLParameters,
	MariaDB:       MariaDBParameters,
	MongoDB:       MongoDBParameters,
	Cassandra:     CassandraParameters,
	ClickHouse:    ClickHouseParameters,
	Redis:         RedisParameters,
	Memcached:     MemcachedParameters,
	Etcd:          EtcdParameters,
	Kafka:         KafkaParameters,
	RabbitMQ:      RabbitMQParameters,
	NATS:          NATSParameters,
	Pulsar:        PulsarParameters,
	Elasticsearch: ElasticsearchParameters,
	OpenSearch:    OpenSearchParameters,
	S3:            S3Parameters,
	MinIO:         MinIOParameters,
	Ceph:          CephParameters,
	Temporal:      TemporalParameters,
	Airflow:       AirflowParameters,
	Argo:          ArgoParameters,
	Nginx:         NginxParameters,
	Envoy:         EnvoyParameters,
	Kong:          KongParameters,
	Traefik:       TraefikParameters,
	HAProxy:       HAProxyParameters,
	Prometheus:    PrometheusParameters,
	Grafana:       GrafanaParameters,
	Zabbix:        ZabbixParameters,
	Jaeger:        JaegerParameters,
	Zipkin:        ZipkinParameters,
	OpenTelemetry: OpenTelemetryParameters,
	Keycloak:      KeycloakParameters,
	Vault:         VaultParameters,
}
