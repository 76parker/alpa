package httputil

import (
	"encoding/json"
	"testing"
)

func TestListResponsePaginationContainsOnlyLimitAndOffset(t *testing.T) {
	// Clients use limit and offset to request a page; page availability is not part of the response contract.
	response := ListResponse[string]{
		Data: []string{"first"},
		Pagination: PaginationResponse{
			Limit:  10,
			Offset: 20,
		},
	}

	body, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("marshal list response: %v", err)
	}

	var got struct {
		Pagination map[string]json.RawMessage `json:"pagination"`
	}
	if err := json.Unmarshal(body, &got); err != nil {
		t.Fatalf("unmarshal list response: %v", err)
	}

	if len(got.Pagination) != 2 {
		t.Fatalf("pagination fields = %v, want limit and offset only", got.Pagination)
	}
}
