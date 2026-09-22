package integration

import "github.com/76parker/alpa/internal/domain/inventory"

type CreateCommand struct {
	ClientID    int64
	APIID       int64
	Action      inventory.ClientAction
	Description *string
}

type UpdateDescriptionCommand struct {
	IntegrationID int64
	Description   *string
}
