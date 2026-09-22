package integrations

import "github.com/76parker/alpa/internal/domain/inventory"

type ResponseV1 struct {
	ID          int64                  `json:"id"`
	ClientID    int64                  `json:"client_id"`
	APIID       int64                  `json:"api_id"`
	Action      inventory.ClientAction `json:"action"`
	Description *string                `json:"description"`
}

func NewResponseV1(integration inventory.Integration) ResponseV1 {
	return ResponseV1{
		ID:          integration.ID(),
		ClientID:    integration.ClientID(),
		APIID:       integration.APIID(),
		Action:      integration.Action(),
		Description: integration.Description(),
	}
}
