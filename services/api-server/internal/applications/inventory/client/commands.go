package client

import "github.com/76parker/alpa/internal/domain/inventory"

type CreateCommand struct {
	ComponentID      int64
	ClientName       inventory.ComponentClientName
	Capabilities     *string
	SecureConnection bool
}

type UpdateCommand struct {
	ComponentID      int64
	ClientID         int64
	ClientName       inventory.ComponentClientName
	Capabilities     *string
	SecureConnection bool
}
