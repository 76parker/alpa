package e2e_test

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"testing"

	"github.com/76parker/alpa/internal/domain/inventory"
	httpapis "github.com/76parker/alpa/internal/httpapi/apis"
	"github.com/ozontech/testo"
	allure "github.com/ozontech/testo-allure"
)

func TestComponentAPINameE2E(t *testing.T) {
	client := environment.server.Client()

	t.Run("RejectAPIWithoutName", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component API")
		t.Story("Require API name")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject API creation when the required name is omitted")
		resetDatabase(t)

		product := createTestProductForComponent(t, client)
		createdComponent, statusCode := createTestComponent(t, client, testBackendComponentRequest(product.ID, "Orders"))
		t.Require().Equal(http.StatusCreated, statusCode)

		apiRoute := environment.server.URL + "/v1/components/" + strconv.FormatInt(createdComponent.ID, 10) + "/apis"
		statusCode, responseBody := postJSON(t, client, apiRoute, `{"api_type":"rest","network_exposure":"internal"}`)
		t.Assert().Equal(http.StatusBadRequest, statusCode)
		t.Assert().Contains(string(responseBody), "name")
	}, allureArtifactsDir))

	t.Run("CreateAPIWith20NonWhitespaceCharacters", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component API")
		t.Story("Create API")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Create API with exactly 20 non-whitespace name characters")
		resetDatabase(t)

		product := createTestProductForComponent(t, client)
		createdComponent, statusCode := createTestComponent(t, client, testBackendComponentRequest(product.ID, "Orders"))
		t.Require().Equal(http.StatusCreated, statusCode)

		const apiName = "abcdefghij абвгдежзий"
		apiRoute := environment.server.URL + "/v1/components/" + strconv.FormatInt(createdComponent.ID, 10) + "/apis"
		statusCode, responseBody := postJSON(t, client, apiRoute, fmt.Sprintf(
			`{"name":%q,"api_type":"rest","network_exposure":"internal"}`,
			apiName,
		))
		t.Require().Equal(http.StatusCreated, statusCode, string(responseBody))

		var createdAPI struct {
			Name string `json:"name"`
		}
		t.Require().NoError(json.Unmarshal(responseBody, &createdAPI))
		t.Assert().Equal(apiName, createdAPI.Name)
	}, allureArtifactsDir))

	t.Run("UpdateAPIRequiresAndPersistsName", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component API")
		t.Story("Update API")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Require and persist the API name when updating an API")
		resetDatabase(t)

		product := createTestProductForComponent(t, client)
		createdComponent, statusCode := createTestComponent(t, client, testBackendComponentRequest(product.ID, "Orders"))
		t.Require().Equal(http.StatusCreated, statusCode)
		createdAPI, statusCode := createTestAPI(t, client, createdComponent.ID, httpapis.CreateRequestV1{
			Name:            "Orders API",
			APIType:         inventory.REST,
			NetworkExposure: inventory.InternalExposure,
		})
		t.Require().Equal(http.StatusCreated, statusCode)

		apiRoute := environment.server.URL + "/v1/components/" + strconv.FormatInt(createdComponent.ID, 10) + "/apis/" + strconv.FormatInt(createdAPI.ID, 10)
		statusCode, responseBody := sendJSON(t, client, http.MethodPut, apiRoute, `{"name":"Orders public API","api_type":"rest","network_exposure":"internet"}`)
		t.Require().Equal(http.StatusOK, statusCode, string(responseBody))
		var updatedAPI struct {
			Name string `json:"name"`
		}
		t.Require().NoError(json.Unmarshal(responseBody, &updatedAPI))
		t.Assert().Equal("Orders public API", updatedAPI.Name)

		statusCode, responseBody = sendJSON(t, client, http.MethodPut, apiRoute, `{"api_type":"rest","network_exposure":"internal"}`)
		t.Assert().Equal(http.StatusBadRequest, statusCode)
		t.Assert().Contains(string(responseBody), "name")
	}, allureArtifactsDir))

	t.Run("RejectAPIWithMoreThan20NonWhitespaceCharacters", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component API")
		t.Story("Validate API name")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject API names with more than 20 non-whitespace characters")
		resetDatabase(t)

		product := createTestProductForComponent(t, client)
		createdComponent, statusCode := createTestComponent(t, client, testBackendComponentRequest(product.ID, "Orders"))
		t.Require().Equal(http.StatusCreated, statusCode)

		apiRoute := environment.server.URL + "/v1/components/" + strconv.FormatInt(createdComponent.ID, 10) + "/apis"
		statusCode, responseBody := postJSON(t, client, apiRoute, `{"name":"ABCDEFGHIJKLMNOPQRSTU","api_type":"rest","network_exposure":"internal"}`)
		t.Require().Equal(http.StatusBadRequest, statusCode)
		t.Assert().Contains(string(responseBody), "name must be at most 20 non-whitespace characters long")
	}, allureArtifactsDir))

	t.Run("CreateComponentWithNamedAPI", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component API")
		t.Story("Create API with component")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Create a component with a named API and return its name")
		resetDatabase(t)

		product := createTestProductForComponent(t, client)
		componentRoute := environment.server.URL + "/v1/components"
		requestBody := fmt.Sprintf(
			`{"product_id":%d,"name":"Orders","type":"backend-service","details":{"language":"go"},"apis":[{"name":"Orders REST","api_type":"rest","network_exposure":"internal"}]}`,
			product.ID,
		)
		statusCode, responseBody := postJSON(t, client, componentRoute, requestBody)
		t.Require().Equal(http.StatusCreated, statusCode, string(responseBody))

		var createdComponent struct {
			APIs []struct {
				Name string `json:"name"`
			} `json:"apis"`
		}
		t.Require().NoError(json.Unmarshal(responseBody, &createdComponent))
		t.Require().Len(createdComponent.APIs, 1)
		t.Assert().Equal("Orders REST", createdComponent.APIs[0].Name)
	}, allureArtifactsDir))
}

func postJSON(t T, client *http.Client, route, requestBody string) (int, []byte) {
	return sendJSON(t, client, http.MethodPost, route, requestBody)
}

func sendJSON(t T, client *http.Client, method, route, requestBody string) (int, []byte) {
	t.Helper()
	request, err := http.NewRequestWithContext(t.Context(), method, route, strings.NewReader(requestBody))
	t.Require().NoError(err)
	request.Header.Set("Content-Type", "application/json")

	response, err := client.Do(request)
	t.Require().NoError(err)
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	t.Require().NoError(err)
	return response.StatusCode, responseBody
}
