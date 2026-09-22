package inventory

type ComponentClientType struct {
	clientName        ComponentClientName
	communicationType CommunicationType
}

func (c ComponentClientType) ClientName() ComponentClientName {
	return c.clientName
}

func (c ComponentClientType) CommunicationType() CommunicationType {
	return c.communicationType
}
