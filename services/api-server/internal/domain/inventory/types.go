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
