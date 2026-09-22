package inventory

type ComponentType string

const (
	Frontend       ComponentType = "frontend-service"
	Backend        ComponentType = "backend-service"
	Infrastructure ComponentType = "infrastructure"
)

type TechnologyName string

const (
	// Databases
	PostgreSQL TechnologyName = "postgresql"
	MySQL      TechnologyName = "mysql"
	MariaDB    TechnologyName = "mariadb"
	MongoDB    TechnologyName = "mongodb"
	Cassandra  TechnologyName = "cassandra"
	ClickHouse TechnologyName = "clickhouse"

	// Cache / Key-Value
	Redis     TechnologyName = "redis"
	Memcached TechnologyName = "memcached"
	Etcd      TechnologyName = "etcd"

	// Message Brokers / Streaming
	Kafka    TechnologyName = "kafka"
	RabbitMQ TechnologyName = "rabbitmq"
	NATS     TechnologyName = "nats"
	Pulsar   TechnologyName = "pulsar"

	// Search
	Elasticsearch TechnologyName = "elasticsearch"
	OpenSearch    TechnologyName = "opensearch"

	// Object Storage
	S3    TechnologyName = "s3"
	MinIO TechnologyName = "minio"
	Ceph  TechnologyName = "ceph"

	// Workflow Engines
	Temporal TechnologyName = "temporal"
	Airflow  TechnologyName = "airflow"
	Argo     TechnologyName = "argo-workflows"

	// API Gateway / Proxy / Load Balancer
	Nginx   TechnologyName = "nginx"
	Envoy   TechnologyName = "envoy"
	Kong    TechnologyName = "kong"
	Traefik TechnologyName = "traefik"
	HAProxy TechnologyName = "haproxy"

	// Monitoring
	Prometheus TechnologyName = "prometheus"
	Grafana    TechnologyName = "grafana"
	Zabbix     TechnologyName = "zabbix"

	// Tracing / Observability
	Jaeger        TechnologyName = "jaeger"
	Zipkin        TechnologyName = "zipkin"
	OpenTelemetry TechnologyName = "opentelemetry"

	// IAM
	Keycloak TechnologyName = "keycloak"
	// Secrets
	Vault TechnologyName = "vault"
)

type TechnologyType string

const (
	MessageBroker TechnologyType = "message-broker"

	SQLDatabase   TechnologyType = "sql-database"
	NoSQLDatabase TechnologyType = "nosql-database"
	Cache         TechnologyType = "cache"
	SearchEngine  TechnologyType = "search-engine"
	ObjectStorage TechnologyType = "object-storage"

	WorkflowEngine TechnologyType = "workflow-engine"
	ServiceMesh    TechnologyType = "service-mesh"
	APIGateway     TechnologyType = "api-gateway"
	ProxyLB        TechnologyType = "proxy/load-balancer"

	IdentityProvider TechnologyType = "identity-provider"
	SecretStorage    TechnologyType = "secret-storage"

	Monitoring TechnologyType = "monitoring"
	Logging    TechnologyType = "logging"
	Tracing    TechnologyType = "tracing"
)

type InfrastructureCriticality string

const (
	CriticalInfrastructure   InfrastructureCriticality = "critical"
	ImportantInfrastructure  InfrastructureCriticality = "important"
	SupportingInfrastructure InfrastructureCriticality = "supporting"
)

func isValidInfrastructureCriticality(criticality InfrastructureCriticality) bool {
	switch criticality {
	case CriticalInfrastructure, ImportantInfrastructure, SupportingInfrastructure:
		return true
	default:
		return false
	}
}
