package inventory

import (
	"errors"
)

var (
	ErrInvalidClientType                        = errors.New("invalid client type")
	ErrClientAlreadyExists                      = errors.New("client already exists for component")
	ErrClientLimitExceeded                      = errors.New("client limit exceeded: max is 5")
	ErrCapabilitiesTooLarge                     = errors.New("client capabilities exceeds 2 MiB")
	ErrProxyLBTechnologyCanHaveOnlyProxyClients = errors.New("proxy/load-balancer technology type can have only proxy clients")
)

const maxClientTextBytes = 2 * 1024 * 1024

type ComponentClient struct {
	id               int64
	clientType       ComponentClientType
	capabilities     *string
	secureConnection bool
	integrations     []Integration
}

func NewComponentClient(
	clientName ComponentClientName,
	capabilities *string,
	secureConnection bool,
) (ComponentClient, error) {
	clientType, err := NewComponentClientType(clientName)
	if err != nil {
		return ComponentClient{}, err
	}
	if capabilities != nil && len(*capabilities) > maxClientTextBytes {
		return ComponentClient{}, ErrCapabilitiesTooLarge
	}
	return ComponentClient{
		clientType:       clientType,
		capabilities:     cloneStringPointer(capabilities),
		secureConnection: secureConnection,
		integrations:     make([]Integration, 0),
	}, nil
}

func (c *ComponentClient) ID() int64 {
	return c.id
}

func (c *ComponentClient) Type() ComponentClientType {
	return c.clientType
}

func (c *ComponentClient) Capabilities() *string {
	return cloneStringPointer(c.capabilities)
}

func (c *ComponentClient) SecureConnection() bool {
	return c.secureConnection
}

func (c *ComponentClient) Integrations() []Integration {
	return append(make([]Integration, 0, len(c.integrations)), c.integrations...)
}

func (c *ComponentClient) WithIntegrations(integrations []Integration) {
	c.integrations = append(make([]Integration, 0, len(integrations)), integrations...)
}

func (c *ComponentClient) SupportsAction(action ClientAction) bool {
	if c.clientType.clientName == HTTPProxyClient || c.clientType.clientName == GRPCProxyClient {
		return action == Proxy
	}
	switch c.clientType.CommunicationType() {
	case Events:
		return action == Produce || action == Consume
	case Stream:
		return action == ListenEvents
	case RequestResponse, Polling, LongPolling:
		return action == Call
	default:
		return false
	}
}

func RestoreComponentClient(
	id int64,
	clientName ComponentClientName,
	capabilities *string,
	secureConnection bool,
) ComponentClient {
	return ComponentClient{
		id: id,
		clientType: ComponentClientType{
			clientName:        clientName,
			communicationType: resolveCommunicationType[clientName],
		},
		capabilities:     cloneStringPointer(capabilities),
		secureConnection: secureConnection,
		integrations:     make([]Integration, 0),
	}
}

func isValidClientName(clientName ComponentClientName) bool {
	switch clientName {
	case S3Client,
		RESTClient,
		GraphQLClient,
		GRPCClient,
		JSONRPCClient,
		SOAPClient,
		WebSocketClient,
		OdataClient,
		SSEClient,
		KafkaClient,
		RabbitMQClient,
		AMQPClient,
		RedpandaClient,
		NATSClient,
		PulsarClient,
		SQSClient,
		GCPPubSubClient,
		AzureServiceBusClient,
		RedisStreamsClient,
		ActiveMQClient,
		IBMMQClient,
		NativeProtocolClient,
		GRPCStreamClient:
		return true
	default:
		return false
	}
}

func NewComponentClientType(clientName ComponentClientName) (ComponentClientType, error) {
	if !isValidClientName(clientName) {
		return ComponentClientType{}, ErrInvalidClientType
	}
	communicationType, ok := resolveCommunicationType[clientName]
	if !ok {
		return ComponentClientType{}, ErrInvalidClientType
	}
	return ComponentClientType{
		clientName:        clientName,
		communicationType: communicationType,
	}, nil
}
