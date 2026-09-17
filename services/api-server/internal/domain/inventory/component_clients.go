package inventory

import "errors"

var (
	ErrInvalidClientType    = errors.New("invalid client type")
	ErrInvalidClientBinding = errors.New("invalid client binding")
	ErrClientAlreadyBound   = errors.New("client already bound")
	ErrClientLimitExceeded  = errors.New("client limit exceeded: max is 5")
)

type ComponentClient struct {
	id          int64
	clientType  ComponentClientType
	description string
	apiID       *int64
}

func NewComponentClient(
	clientName ComponentClientName,
	role ComponentClientRole,
	communicationType CommunicationType,
	description string,
) (ComponentClient, error) {
	clientType, err := NewComponentClientType(clientName, role, communicationType)
	if err != nil {
		return ComponentClient{}, err
	}
	return ComponentClient{
		clientType:  clientType,
		description: description,
	}, nil
}

func (c *ComponentClient) ID() int64 {
	return c.id
}

func (c *ComponentClient) Type() ComponentClientType {
	return c.clientType
}

func (c *ComponentClient) Description() string {
	return c.description
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
	communicationType CommunicationType,
	description string,
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
			communicationType: communicationType,
		},
		description: description,
		apiID:       restoredAPIID,
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
		NativeProtocolClient:
		return true
	default:
		return false
	}
}

func NewComponentClientType(
	clientName ComponentClientName,
	role ComponentClientRole,
	communicationType CommunicationType,
) (ComponentClientType, error) {
	if !isValidClientName(clientName) ||
		!isValidClientRole(role) ||
		!isValidCommunicationType(communicationType) {
		return ComponentClientType{}, ErrInvalidClientType
	}

	if isAsyncClient(clientName) {
		if role != EventProducerRole && role != EventConsumerRole {
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
		if role != ListenerRole {
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
	if role != CallerRole {
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
	case ListenerRole, CallerRole, EventProducerRole, EventConsumerRole:
		return true
	default:
		return false
	}
}

func isValidCommunicationType(communicationType CommunicationType) bool {
	switch communicationType {
	case RequestResponse, Polling, LongPolling, Events, Stream:
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
		SSEClient:
		return true
	default:
		return false
	}
}
