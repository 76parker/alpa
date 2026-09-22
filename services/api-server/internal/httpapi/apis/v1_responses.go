package apis

import "github.com/76parker/alpa/internal/domain/inventory"

type ResponseV1 struct {
	ID              int64                     `json:"id"`
	Name            string                    `json:"name"`
	APIType         inventory.APIType         `json:"api_type"`
	NetworkExposure inventory.NetworkExposure `json:"network_exposure"`
}

func NewResponseV1(api inventory.ComponentAPI) ResponseV1 {
	return ResponseV1{
		ID:              api.ID(),
		Name:            api.Name(),
		APIType:         api.APIType(),
		NetworkExposure: api.Exposure(),
	}
}
