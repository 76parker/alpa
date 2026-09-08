package e2e_test

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	allure "github.com/ozontech/testo-allure"
)

func marshalRequestBody(t T, testStruct any) (io.Reader, []byte) {
	requestBody, err := json.Marshal(testStruct)
	if err != nil {
		t.Fatal(err)
	}
	copied := make([]byte, len(requestBody))
	copy(copied, requestBody)
	return strings.NewReader(string(requestBody)), copied
}
func unmarshalResponseBody[Q any](t T, response *http.Response) (Q, []byte) {
	var target Q
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	copied := make([]byte, len(body))
	copy(copied, body)
	if err := json.Unmarshal(body, &target); err != nil {
		t.Fatal(err)
	}
	return target, copied
}

func allureJSONAttachment(t T, body []byte) allure.AttachmentBytes {
	return allure.AttachmentBytes{
		Data:      body,
		MediaType: allure.DocumentJSON,
	}
}
