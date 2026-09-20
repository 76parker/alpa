package inventory

var ()

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
	GRPCStreamClient      ComponentClientName = "grpc-streaming-client"
)

type CommunicationType string

var resolveCommunicationType = map[ComponentClientName]CommunicationType{
	S3Client:              RequestResponse,
	RESTClient:            RequestResponse,
	GraphQLClient:         RequestResponse,
	GRPCClient:            RequestResponse,
	JSONRPCClient:         RequestResponse,
	SOAPClient:            RequestResponse,
	WebSocketClient:       Stream,
	OdataClient:           RequestResponse,
	SSEClient:             Stream,
	KafkaClient:           Events,
	RabbitMQClient:        Events,
	AMQPClient:            Events,
	RedpandaClient:        Events,
	NATSClient:            Events,
	PulsarClient:          Events,
	SQSClient:             Events,
	GCPPubSubClient:       Events,
	AzureServiceBusClient: Events,
	RedisStreamsClient:    Events,
	ActiveMQClient:        Events,
	IBMMQClient:           Events,
	NativeProtocolClient:  RequestResponse,
	GRPCStreamClient:      Stream,
}

const (
	RequestResponse CommunicationType = "request-response"
	Polling         CommunicationType = "polling"
	LongPolling     CommunicationType = "long-polling"
	Events          CommunicationType = "events"
	Stream          CommunicationType = "stream"
)
