package inventory

import (
	"errors"
	"slices"
)

var (
	ErrUnknownTechnologyName            = errors.New("unknown technology name")
	ErrUnknownTechnologyType            = errors.New("unknown technology type")
	ErrTooManyEndpoints                 = errors.New("too many endpoints")
	ErrInvalidComponentName             = errors.New("invalid component name")
	ErrUnknownComponentType             = errors.New("unknown component type")
	ErrEmptyDetails                     = errors.New("component details cannot be empty")
	ErrInvalidDetails                   = errors.New("invalid component details")
	ErrComponentDetailsTypeMismatch     = errors.New("component details type does not match component type")
	ErrInvalidDescription               = errors.New("invalid component description")
	ErrInvalidInfrastructureCriticality = errors.New("invalid infrastructure criticality")
	ErrTechnologyTypeMismatch           = errors.New("technology type and technology name mismatch")
	ErrInfrastructureCannotHaveClient   = errors.New("only proxy/load-balancer technology types can have clients")
)

type ComponentDetails interface {
	componentType() ComponentType
	validate() error
}

type Component struct {
	id          int64
	productID   int64
	name        string
	description string
	details     ComponentDetails
	apis        []ComponentAPI
	clients     []ComponentClient
}

func NewComponent(
	productID int64,
	name string,
	description string,
	componentType ComponentType,
	details ComponentDetails,
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

	return Component{
		productID:   productID,
		name:        name,
		description: description,
		details:     details,
		apis:        make([]ComponentAPI, 0),
		clients:     make([]ComponentClient, 0),
	}, nil
}

func isValidComponentType(componentType ComponentType) bool {
	switch componentType {
	case Backend,
		Frontend,
		Infrastructure:
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

func (c *Component) Clients() []ComponentClient {
	return slices.Clone(c.clients)
}

func (c *Component) Type() ComponentType {
	return c.details.componentType()
}

func (c *Component) WithAPIs(apis []ComponentAPI) {
	c.apis = apis
}

func (c *Component) WithClients(clients []ComponentClient) {
	c.clients = clients
}

func RestoreComponent(
	id int64,
	productID int64,
	name string,
	description string,
	details ComponentDetails,
	apis []ComponentAPI,
	clients []ComponentClient,
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
		apis:        append(make([]ComponentAPI, 0, len(apis)), apis...),
		clients:     append(make([]ComponentClient, 0, len(clients)), clients...),
	}, nil
}
