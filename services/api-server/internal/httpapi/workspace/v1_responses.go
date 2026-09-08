package workspace

import "github.com/76parker/alpa/internal/domain/inventory"

type ResponseV1 struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

func NewResponseV1(workspace inventory.Workspace) ResponseV1 {
	return ResponseV1{ID: workspace.ID(), Name: workspace.Name()}
}
