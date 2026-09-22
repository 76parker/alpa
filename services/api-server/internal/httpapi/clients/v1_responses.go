package clients

import "github.com/76parker/alpa/internal/domain/inventory"

type ResponseV1 struct {
	ID                int64                         `json:"id"`
	ClientName        inventory.ComponentClientName `json:"client_name"`
	CommunicationType inventory.CommunicationType   `json:"communication_type"`
	Capabilities      *string                       `json:"capabilities"`
	SecureConnection  bool                          `json:"secure_connection"`
}

func NewResponseV1(client inventory.ComponentClient) ResponseV1 {
	response := ResponseV1{
		ID:                client.ID(),
		ClientName:        client.Type().ClientName(),
		CommunicationType: client.Type().CommunicationType(),
		Capabilities:      client.Capabilities(),
		SecureConnection:  client.SecureConnection(),
	}
	return response
}
