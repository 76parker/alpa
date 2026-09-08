package inventory

import (
	"errors"
	"slices"
)

var (
	ErrInvalidComponentName         = errors.New("invalid component name")
	ErrUnknownComponentType         = errors.New("unknown component type")
	ErrUnknownBroker                = errors.New("invalid broker")
	ErrEmptyDetails                 = errors.New("component details cannot be empty")
	ErrInvalidDetails               = errors.New("invalid component details")
	ErrComponentDetailsTypeMismatch = errors.New("component details type does not match component type")
	ErrInvalidDescription           = errors.New("invalid component description")
)

type ComponentType string

type EventBrokerType string

type ComponentDetails interface {
	componentType() ComponentType
	validate() error
}

const (
	ComponentTypeFrontend         ComponentType = "Frontend Service"
	ComponentTypeBackend          ComponentType = "Backend Service"
	ComponentTypeInfrastructure   ComponentType = "Infrastructure"
	ComponentTypeBackgroundWorker ComponentType = "Background Worker"

	RabbitMQBroker        EventBrokerType = "RabbitMQ"
	KafkaBroker           EventBrokerType = "Kafka"
	RedpandaBroker        EventBrokerType = "Redpanda"
	NATSBroker            EventBrokerType = "NATS/JetStream"
	PulsarBroker          EventBrokerType = "Apache Pulsar"
	SQSBroker             EventBrokerType = "AWS SQS"
	GCPBroker             EventBrokerType = "Google Cloud Pub/Sub"
	AzureServiceBusBroker EventBrokerType = "Azure Service Bus"
	RedisStreamsBroker    EventBrokerType = "Redis Streams"
	ActiveMQBroker        EventBrokerType = "ActiveMQ"
	IBMMQBroker           EventBrokerType = "IBM MQ"
)

type Component struct {
	id          int64
	productID   int64
	name        string
	description string
	details     ComponentDetails
	apis        []ComponentAPI
}

type ComponentAPI struct {
	API  API
	Role APIRole
}

func NewComponent(
	productID int64,
	name string,
	description string,
	componentType ComponentType,
	details ComponentDetails,
	providerAPIs []API,
) (Component, error) {
	if productID <= 0 {
		return Component{}, ErrNegativeID
	}
	if name == "" {
		return Component{}, ErrInvalidComponentName
	}
	if !isValidComponentType(componentType) {
		return Component{}, ErrUnknownComponentType
	}
	if details == nil {
		return Component{}, ErrEmptyDetails
	}
	if details.componentType() != componentType {
		return Component{}, ErrComponentDetailsTypeMismatch
	}
	if err := details.validate(); err != nil {
		return Component{}, err
	}
	apis := make([]ComponentAPI, len(providerAPIs))
	for i, api := range providerAPIs {
		apis[i] = ComponentAPI{
			API:  api,
			Role: APIRoleProvider,
		}
	}
	return Component{
		productID:   productID,
		name:        name,
		description: description,
		details:     details,
		apis:        apis,
	}, nil
}

func isValidComponentType(componentType ComponentType) bool {
	switch componentType {
	case ComponentTypeBackend,
		ComponentTypeFrontend,
		ComponentTypeInfrastructure,
		ComponentTypeBackgroundWorker:
		return true
	default:
		return false
	}
}

func (c *Component) ID() int64 {
	return c.id
}
func (c *Component) ProductID() int64 {
	return c.productID
}
func (c *Component) Name() string {
	return c.name
}
func (c *Component) Description() string {
	return c.description
}
func (c *Component) Details() ComponentDetails {
	return c.details
}
func (c *Component) APIs() []ComponentAPI {
	return slices.Clone(c.apis)
}

func (c *Component) Type() ComponentType {
	return c.details.componentType()
}

func RestoreComponent(
	id int64,
	productID int64,
	name string,
	description string,
	details ComponentDetails,
	apis []ComponentAPI,
) (Component, error) {
	if details == nil {
		return Component{}, ErrEmptyDetails
	}
	if err := details.validate(); err != nil {
		return Component{}, err
	}
	return Component{
		id:          id,
		productID:   productID,
		name:        name,
		description: description,
		details:     details,
		apis:        slices.Clone(apis),
	}, nil
}
