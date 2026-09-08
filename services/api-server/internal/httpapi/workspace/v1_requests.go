package workspace

type CreateRequestV1 struct {
	Name string `json:"name" validate:"required,max=50,allowed_text"`
}
