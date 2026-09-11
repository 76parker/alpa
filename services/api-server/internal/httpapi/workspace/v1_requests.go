package workspace

import "strings"

type CreateRequestV1 struct {
	Name string `json:"name" validate:"max=50,allowed_text"`
}

func (r *CreateRequestV1) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
}
