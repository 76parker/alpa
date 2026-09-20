package inventory

import "errors"

var (
	ErrInvalidClientType    = errors.New("invalid client type")
	ErrInvalidClientBinding = errors.New("invalid client binding")
	ErrClientAlreadyBound   = errors.New("client already bound")
	ErrClientLimitExceeded  = errors.New("client limit exceeded: max is 5")
	ErrActionTooLarge       = errors.New("client action exceeds 2 MiB")
	ErrCapabilitiesTooLarge = errors.New("client capabilities exceeds 2 MiB")
)

const maxClientTextBytes = 2 * 1024 * 1024

type ComponentClient struct {
	id               int64
	clientType       ComponentClientType
	action           *string
	capabilities     *string
	secureConnection bool
	apiID            *int64
}

func NewComponentClient(
	clientName ComponentClientName,
	role ComponentClientRole,
	action *string,
	capabilities *string,
	secureConnection bool,
) (ComponentClient, error) {
	clientType, err := NewComponentClientType(clientName, role)
	if err != nil {
		return ComponentClient{}, err
	}
	if action != nil && len(*action) > maxClientTextBytes {
		return ComponentClient{}, ErrActionTooLarge
	}
	if capabilities != nil && len(*capabilities) > maxClientTextBytes {
		return ComponentClient{}, ErrCapabilitiesTooLarge
	}
	return ComponentClient{
		clientType:       clientType,
		action:           cloneStringPointer(action),
		capabilities:     cloneStringPointer(capabilities),
		secureConnection: secureConnection,
	}, nil
}

func (c *ComponentClient) ID() int64 {
	return c.id
}

func (c *ComponentClient) Type() ComponentClientType {
	return c.clientType
}

func (c *ComponentClient) Action() *string {
	return cloneStringPointer(c.action)
}

func (c *ComponentClient) Capabilities() *string {
	return cloneStringPointer(c.capabilities)
}

func (c *ComponentClient) SecureConnection() bool {
	return c.secureConnection
}

func (c *ComponentClient) APIID() *int64 {
	if c.apiID == nil {
		return nil
	}
	apiID := *c.apiID
	return &apiID
}

func RestoreComponentClient(
	id int64,
	clientName ComponentClientName,
	role ComponentClientRole,
	action *string,
	capabilities *string,
	secureConnection bool,
	apiID *int64,
) ComponentClient {
	var restoredAPIID *int64
	if apiID != nil {
		value := *apiID
		restoredAPIID = &value
	}
	return ComponentClient{
		id: id,
		clientType: ComponentClientType{
			clientName:        clientName,
			role:              role,
			communicationType: resolveCommunicationType[clientName],
		},
		action:           cloneStringPointer(action),
		capabilities:     cloneStringPointer(capabilities),
		secureConnection: secureConnection,
		apiID:            restoredAPIID,
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

func NewComponentClientType(
	clientName ComponentClientName,
	role ComponentClientRole,
) (ComponentClientType, error) {
	if !isValidClientName(clientName) || !isValidClientRole(role) {
		return ComponentClientType{}, ErrInvalidClientType
	}
	communicationType, ok := resolveCommunicationType[clientName]
	if !ok {
		return ComponentClientType{}, ErrInvalidClientType
	}

	if isAsyncClient(clientName) {
		if role != Producer && role != Consumer {
			return ComponentClientType{}, ErrAsyncClientCannotBeCallerRole
		}
		if communicationType != Events {
			return ComponentClientType{}, ErrAsyncClientInvalidCommunicationType
		}
		return ComponentClientType{
			clientName:        clientName,
			communicationType: Events,
			role:              role,
		}, nil
	}
	if isStreamingClient(clientName) {
		if role != Listener {
			return ComponentClientType{}, ErrStreamingClientCanBeOnlyListener
		}
		if communicationType != Stream {
			return ComponentClientType{}, ErrStreamingClientInvalidCommunicationType
		}
		return ComponentClientType{
			clientName:        clientName,
			communicationType: Stream,
			role:              role,
		}, nil
	}
	if role != Caller {
		return ComponentClientType{}, ErrSyncClientCanBeOnlyCallerRole
	}
	if communicationType == Events {
		return ComponentClientType{}, ErrSyncCallerCannotHaveEventCommunicationType
	}
	return ComponentClientType{
		clientName:        clientName,
		communicationType: communicationType,
		role:              role,
	}, nil
}

func isValidClientRole(role ComponentClientRole) bool {
	switch role {
	case Listener, Caller, Producer, Consumer:
		return true
	default:
		return false
	}
}

func isAsyncClient(clientName ComponentClientName) bool {
	//nolint:exhaustive // intentionally checks only asynchronous clients
	switch clientName {
	case KafkaClient,
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
		IBMMQClient:
		return true
	default:
		return false
	}
}

func isStreamingClient(clientName ComponentClientName) bool {
	//nolint:exhaustive // intentionally checks only streaming clients
	switch clientName {
	case WebSocketClient,
		SSEClient,
		GRPCStreamClient:
		return true
	default:
		return false
	}
}
