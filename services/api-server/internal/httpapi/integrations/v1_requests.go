package integrations

import (
	"bytes"
	"encoding/json/v2"
	"strings"

	"github.com/76parker/alpa/internal/domain/inventory"
)

type CreateRequestV1 struct {
	ClientID    int64                  `json:"client_id" validate:"required,gt=0"`
	APIID       int64                  `json:"api_id" validate:"required,gt=0"`
	Action      inventory.ClientAction `json:"action" validate:"required,max=50,allowed_text"`
	Description *string                `json:"description,omitempty" validate:"omitempty,min=1,max=1000,allowed_text"`
}

type UpdateDescriptionRequestV1 struct {
	Description NullableString `json:"description"`
}

type NullableString struct {
	isSet bool
	value *string
}

func (v *NullableString) UnmarshalJSON(data []byte) error {
	v.isSet = true
	if bytes.Equal(data, []byte("null")) {
		v.value = nil
		return nil
	}
	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	v.value = &value
	return nil
}

func (v NullableString) Value() (*string, bool) {
	if !v.isSet || v.value == nil {
		return nil, v.isSet
	}
	value := *v.value
	return &value, true
}

func (r *CreateRequestV1) Normalize() {
	r.Action = inventory.ClientAction(strings.TrimSpace(string(r.Action)))
}
