package clients

import "github.com/76parker/alpa/internal/domain/inventory"

type ResponseV1 struct {
	ID                int64                         `json:"id"`
	ClientName        inventory.ComponentClientName `json:"client_name"`
	Role              inventory.ComponentClientRole `json:"role"`
	CommunicationType inventory.CommunicationType   `json:"communication_type"`
	Description       string                        `json:"description"`
	APIID             *int64                        `json:"api_id"`
}

type BindAPIResponseV1 struct {
	ClientID int64 `json:"client_id"`
	APIID    int64 `json:"api_id"`
}

func NewResponseV1(client inventory.ComponentClient) ResponseV1 {
	response := ResponseV1{
		ID:                client.ID(),
		ClientName:        client.Type().ClientName(),
		Role:              client.Type().Role(),
		CommunicationType: client.Type().CommunicationType(),
		Description:       client.Description(),
	}
	response.APIID = client.APIID()
	return response
}

func NewBindAPIResponseV1(client inventory.ComponentClient) BindAPIResponseV1 {
	response := BindAPIResponseV1{ClientID: client.ID()}
	if apiID := client.APIID(); apiID != nil {
		response.APIID = *apiID
	}
	return response
}
