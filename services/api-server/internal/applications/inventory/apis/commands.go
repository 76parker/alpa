package apis

import "github.com/76parker/alpa/internal/domain/inventory"

type CreateCommand struct {
	ComponentID      int64
	Name             string
	APIType          inventory.APIType
	NetworkExposure  inventory.NetworkExposure
	DocumentationURL *string
}

type UpdateCommand struct {
	ComponentID      int64
	APIID            int64
	Name             string
	APIType          inventory.APIType
	NetworkExposure  inventory.NetworkExposure
	DocumentationURL *string
}
