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

type ComponentClientRole string

const (
	Listener ComponentClientRole = "listener"
	Caller   ComponentClientRole = "caller"
	Producer ComponentClientRole = "producer"
	Consumer ComponentClientRole = "consumer"
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
