package inventory

import "errors"

var (
	ErrAsyncClientCannotBeCallerRole              = errors.New("async client cannot be caller role")
	ErrAsyncClientInvalidCommunicationType        = errors.New("async client cannot have non-event communication type")
	ErrStreamingClientCanBeOnlyListener           = errors.New("streaming client can only be listener role")
	ErrStreamingClientInvalidCommunicationType    = errors.New("streaming client cannot have non-stream communication type")
	ErrSyncClientCanBeOnlyCallerRole              = errors.New("sync client can only be caller role")
	ErrSyncCallerCannotHaveEventCommunicationType = errors.New("sync caller cannot have event communication type")
)

type ComponentType string

const (
	ComponentTypeFrontend       ComponentType = "frontend-service"
	ComponentTypeBackend        ComponentType = "backend-service"
	ComponentTypeInfrastructure ComponentType = "infrastructure"
)

type InfrastructureTechnology string

const (
	// Databases
	InfrastructureTechnologyPostgreSQL InfrastructureTechnology = "postgresql"
	InfrastructureTechnologyMySQL      InfrastructureTechnology = "mysql"
	InfrastructureTechnologyMariaDB    InfrastructureTechnology = "mariadb"
	InfrastructureTechnologyMongoDB    InfrastructureTechnology = "mongodb"
	InfrastructureTechnologyCassandra  InfrastructureTechnology = "cassandra"
	InfrastructureTechnologyClickHouse InfrastructureTechnology = "clickhouse"

	// Cache / Key-Value
	InfrastructureTechnologyRedis     InfrastructureTechnology = "redis"
	InfrastructureTechnologyMemcached InfrastructureTechnology = "memcached"
	InfrastructureTechnologyEtcd      InfrastructureTechnology = "etcd"

	// Message Brokers / Streaming
	InfrastructureTechnologyKafka    InfrastructureTechnology = "kafka"
	InfrastructureTechnologyRabbitMQ InfrastructureTechnology = "rabbitmq"
	InfrastructureTechnologyNATS     InfrastructureTechnology = "nats"
	InfrastructureTechnologyPulsar   InfrastructureTechnology = "pulsar"

	// Search
	InfrastructureTechnologyElasticsearch InfrastructureTechnology = "elasticsearch"
	InfrastructureTechnologyOpenSearch    InfrastructureTechnology = "opensearch"

	// Object Storage
	InfrastructureTechnologyS3    InfrastructureTechnology = "s3"
	InfrastructureTechnologyMinIO InfrastructureTechnology = "minio"
	InfrastructureTechnologyCeph  InfrastructureTechnology = "ceph"

	// Workflow Engines
	InfrastructureTechnologyTemporal InfrastructureTechnology = "temporal"
	InfrastructureTechnologyAirflow  InfrastructureTechnology = "airflow"
	InfrastructureTechnologyArgo     InfrastructureTechnology = "argo-workflows"

	// API Gateway / Proxy / Load Balancer
	InfrastructureTechnologyNginx   InfrastructureTechnology = "nginx"
	InfrastructureTechnologyEnvoy   InfrastructureTechnology = "envoy"
	InfrastructureTechnologyKong    InfrastructureTechnology = "kong"
	InfrastructureTechnologyTraefik InfrastructureTechnology = "traefik"
	InfrastructureTechnologyHAProxy InfrastructureTechnology = "haproxy"

	// Monitoring
	InfrastructureTechnologyPrometheus InfrastructureTechnology = "prometheus"
	InfrastructureTechnologyGrafana    InfrastructureTechnology = "grafana"
	InfrastructureTechnologyZabbix     InfrastructureTechnology = "zabbix"

	// Tracing / Observability
	InfrastructureTechnologyJaeger        InfrastructureTechnology = "jaeger"
	InfrastructureTechnologyZipkin        InfrastructureTechnology = "zipkin"
	InfrastructureTechnologyOpenTelemetry InfrastructureTechnology = "opentelemetry"

	// IAM
	InfrastructureTechnologyKeycloak InfrastructureTechnology = "keycloak"
	// Secrets
	InfrastructureTechnologyVault InfrastructureTechnology = "vault"
)

type SystemType string

const (
	SystemTypeMessageBroker SystemType = "message-broker"

	SystemTypeSQLDatabase   SystemType = "sql-database"
	SystemTypeNoSQLDatabase SystemType = "nosql-database"
	SystemTypeCache         SystemType = "cache"
	SystemTypeSearchEngine  SystemType = "search-engine"
	SystemTypeObjectStorage SystemType = "object-storage"

	SystemTypeWorkflowEngine SystemType = "workflow-engine"
	SystemTypeServiceMesh    SystemType = "service-mesh"
	SystemTypeAPIGateway     SystemType = "api-gateway"
	SystemTypeLoadBalancer   SystemType = "load-balancer"

	SystemTypeIdentityProvider SystemType = "identity-provider"
	SystemTypeSecretStorage    SystemType = "secret-storage"

	SystemTypeMonitoring SystemType = "monitoring"
	SystemTypeLogging    SystemType = "logging"
	SystemTypeTracing    SystemType = "tracing"
)

type APIType string

const (
	APITypeREST           APIType = "rest"
	APITypeGraphQL        APIType = "graphql"
	APITypeGRPC           APIType = "grpc"
	APITypeJSONRPC        APIType = "json-rpc"
	APITypeSOAP           APIType = "soap"
	APITypeWebSocket      APIType = "websocket"
	APITypeOdata          APIType = "odata"
	APITypeSSE            APIType = "sse"
	APITypeEventConsumer  APIType = "event-consumer"
	APITypeTopic          APIType = "topic"
	APITypeExchange       APIType = "exchange"
	APITypeQueue          APIType = "queue"
	APITypeNativeProtocol APIType = "native-protocol"
)

type NetworkExposure string

const (
	NetworkExposureInternal NetworkExposure = "internal"
	NetworkExposureInternet NetworkExposure = "internet"
)

// Component clients names

type ComponentClientName string

const (
	S3Client              ComponentClientName = "s3-client"
	RESTClient            ComponentClientName = "rest-client"
	GraphQLClient         ComponentClientName = "graphql-client"
	GRPCClient            ComponentClientName = "grpc-client"
	JSONRPCClient         ComponentClientName = "json-rpc-client"
	SOAPClient            ComponentClientName = "soap-client"
	WebSocketClient       ComponentClientName = "websocket-client"
	OdataClient           ComponentClientName = "odata-client"
	SSEClient             ComponentClientName = "sse-client"
	KafkaClient           ComponentClientName = "kafka-client"
	RabbitMQClient        ComponentClientName = "rabbitmq-client"
	AMQPClient            ComponentClientName = "amqp-client"
	RedpandaClient        ComponentClientName = "redpanda-client"
	NATSClient            ComponentClientName = "nats-client"
	PulsarClient          ComponentClientName = "pulsar-client"
	SQSClient             ComponentClientName = "sqs-client"
	GCPPubSubClient       ComponentClientName = "gcp-pub-sub-client"
	AzureServiceBusClient ComponentClientName = "azure-service-bus-client"
	RedisStreamsClient    ComponentClientName = "redis-streams-client"
	ActiveMQClient        ComponentClientName = "activemq-client"
	IBMMQClient           ComponentClientName = "ibm-mq-client"
	NativeProtocolClient  ComponentClientName = "native-protocol-client"
)

type CommunicationType string

const (
	RequestResponse CommunicationType = "request-response"
	Polling         CommunicationType = "polling"
	LongPolling     CommunicationType = "long-polling"
	Events          CommunicationType = "events"
	Stream          CommunicationType = "stream"
)

type ComponentClientRole string

const (
	ListenerRole      ComponentClientRole = "listener"
	CallerRole        ComponentClientRole = "caller"
	EventProducerRole ComponentClientRole = "producer"
	EventConsumerRole ComponentClientRole = "consumer"
)

type ComponentClientType struct {
	clientName        ComponentClientName
	communicationType CommunicationType
	role              ComponentClientRole
}

func (c ComponentClientType) ClientName() ComponentClientName {
	return c.clientName
}

func (c ComponentClientType) CommunicationType() CommunicationType {
	return c.communicationType
}

func (c ComponentClientType) Role() ComponentClientRole {
	return c.role
}
