package e2e_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"testing"

	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/76parker/alpa/internal/httpapi/component"
	"github.com/76parker/alpa/internal/httpapi/product"
	"github.com/ozontech/testo"
	allure "github.com/ozontech/testo-allure"
)

func TestComponentE2E(t *testing.T) {
	client := environment.server.Client()
	t.Run("CreateComponentInProduct", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Create component")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Create component with correct request")
		resetDatabase(t)

		createdProduct := createTestProductForComponent(t, client)
		testRequest := testBackendComponentRequest(createdProduct.ID, "Test Component")
		createdComponent, statusCode := createTestComponent(t, client, testRequest)
		allure.Step(t, "verify created component", func(t T) {
			t.Require().Equal(http.StatusCreated, statusCode, "component creation returns 201 Created")
			t.Assert().Greater(createdComponent.ID, int64(0), "created component receives a positive ID")
			t.Assert().Equal(createdProduct.ID, createdComponent.ProductID, "created component belongs to the requested product")
			t.Assert().Equal(testRequest.Name, createdComponent.Name, "created component has the requested name")
			t.Assert().Equal(string(testRequest.Type), createdComponent.Type, "created component has the requested type")
			t.Assert().Equal(*testRequest.Description, createdComponent.Description, "created component has the requested description")

			details, ok := createdComponent.Details.(map[string]any)
			t.Require().True(ok, "created component returns service details as a JSON object")
			t.Assert().Equal("Go", details["language"], "created component has the requested language")
			t.Assert().Equal("1.25", details["language_version"], "created component has the requested language version")
			t.Assert().Equal("Gin", details["framework"], "created component has the requested framework")

			t.Require().Len(createdComponent.APIs, 1, "created component returns its provider API")
			createdAPI := createdComponent.APIs[0]
			t.Assert().Greater(createdAPI.ID, int64(0), "created provider API receives a positive ID")
			t.Assert().Equal("Component API", createdAPI.Name, "created provider API has the requested name")
			t.Assert().Equal(inventory.APITypeREST, createdAPI.APIType, "created provider API has the requested type")
			t.Assert().Equal(inventory.NetworkExposureInternal, createdAPI.NetworkExposure, "created provider API has the requested network exposure")
			t.Assert().Equal(inventory.APIRoleProvider, createdAPI.Role, "created API has the provider role")
		})
	}, allure.WithOutputDir("../../test-results/allure")))

	t.Run("CreateComponentWithInvalidType", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Create component")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject component with invalid type")
		resetDatabase(t)

		createdProduct := createTestProductForComponent(t, client)
		testRequest := testBackendComponentRequest(createdProduct.ID, "Test Component")
		testRequest.Type = inventory.ComponentType("Invalid")
		_, statusCode := createTestComponent(t, client, testRequest)
		allure.Step(t, "verify rejection for invalid component type", func(t T) {
			t.Require().Equal(http.StatusBadRequest, statusCode, "component creation with an invalid type returns 400 Bad Request")
		})
	}, allure.WithOutputDir("../../test-results/allure")))

	t.Run("CreateComponentWithNonexistentProduct", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Create component")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject component for nonexistent product")
		resetDatabase(t)

		testRequest := testBackendComponentRequest(1, "Test Component")
		_, statusCode := createTestComponent(t, client, testRequest)
		allure.Step(t, "verify rejection for missing product", func(t T) {
			t.Require().Equal(http.StatusNotFound, statusCode, "component creation for a missing product returns 404 Not Found")
		})
	}, allure.WithOutputDir("../../test-results/allure")))

	t.Run("CreateComponentWithInvalidName", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Create component")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject component with invalid name")
		resetDatabase(t)

		createdProduct := createTestProductForComponent(t, client)
		testRequest := testBackendComponentRequest(createdProduct.ID, "<><f1ffsdf!,.<")
		_, statusCode := createTestComponent(t, client, testRequest)
		allure.Step(t, "verify rejection for invalid component name", func(t T) {
			t.Require().Equal(http.StatusBadRequest, statusCode, "component creation with an invalid name returns 400 Bad Request")
		})
	}, allure.WithOutputDir("../../test-results/allure")))

	t.Run("CreateComponentWithInvalidDetails", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Create component")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject component with invalid details")
		resetDatabase(t)

		createdProduct := createTestProductForComponent(t, client)
		testRequest := testBackendComponentRequest(createdProduct.ID, "Test Component")
		testRequest.Details = json.RawMessage(`{"language":""}`)
		_, statusCode := createTestComponent(t, client, testRequest)
		allure.Step(t, "verify rejection for invalid component details", func(t T) {
			t.Require().Equal(http.StatusBadRequest, statusCode, "component creation with invalid details returns 400 Bad Request")
		})
	}, allure.WithOutputDir("../../test-results/allure")))

	// A confirmed relationship must be visible as provider and consumer roles on the respective components.
	t.Run("CreateConsumerAPIRelationship", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Consume component API")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Create a consumer API relationship and return both roles")
		resetDatabase(t)

		createdProduct := createTestProductForComponent(t, client)
		provider, providerStatus := createTestComponent(t, client, testBackendComponentRequest(createdProduct.ID, "Provider Component"))
		consumerRequest := testBackendComponentRequest(createdProduct.ID, "Consumer Component")
		consumerRequest.APIs = nil
		consumer, consumerStatus := createTestComponent(t, client, consumerRequest)
		t.Require().Equal(http.StatusCreated, providerStatus, "provider component is created")
		t.Require().Equal(http.StatusCreated, consumerStatus, "consumer component is created")
		t.Require().Len(provider.APIs, 1, "provider component exposes one API")

		statusCode := addTestConsumerAPI(t, client, consumer.ID, provider.APIs[0].ID)
		t.Require().Equal(http.StatusNoContent, statusCode, "consumer API relationship creation returns 204 No Content")

		returnedProvider, providerStatus := getTestComponent(t, client, provider.ID)
		returnedConsumer, consumerStatus := getTestComponent(t, client, consumer.ID)
		allure.Step(t, "verify provider and consumer roles", func(t T) {
			t.Require().Equal(http.StatusOK, providerStatus, "provider component retrieval returns 200 OK")
			t.Require().Equal(http.StatusOK, consumerStatus, "consumer component retrieval returns 200 OK")
			t.Require().Len(returnedProvider.APIs, 1, "provider keeps one API")
			t.Require().Len(returnedConsumer.APIs, 1, "consumer returns the linked API")
			t.Assert().Equal(inventory.APIRoleProvider, returnedProvider.APIs[0].Role, "provider component returns the provider role")
			t.Assert().Equal(inventory.APIRoleConsumer, returnedConsumer.APIs[0].Role, "consumer component returns the consumer role")
			t.Assert().Equal(provider.APIs[0].ID, returnedConsumer.APIs[0].ID, "consumer returns the linked provider API")
		})
	}, allure.WithOutputDir("../../test-results/allure")))

	// A repeated relationship is a conflict and must not be silently accepted.
	t.Run("RejectDuplicateConsumerAPIRelationship", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Consume component API")
		t.Severity(allure.SeverityNormal)
		t.Tags("e2e", "negative")
		t.Title("Reject a duplicate consumer API relationship")
		resetDatabase(t)

		createdProduct := createTestProductForComponent(t, client)
		provider, _ := createTestComponent(t, client, testBackendComponentRequest(createdProduct.ID, "Provider Component"))
		consumerRequest := testBackendComponentRequest(createdProduct.ID, "Consumer Component")
		consumerRequest.APIs = nil
		consumer, _ := createTestComponent(t, client, consumerRequest)

		firstStatus := addTestConsumerAPI(t, client, consumer.ID, provider.APIs[0].ID)
		duplicateStatus := addTestConsumerAPI(t, client, consumer.ID, provider.APIs[0].ID)
		allure.Step(t, "verify duplicate relationship conflict", func(t T) {
			t.Require().Equal(http.StatusNoContent, firstStatus, "first relationship is created")
			t.Assert().Equal(http.StatusConflict, duplicateStatus, "duplicate relationship returns 409 Conflict")
		})
	}, allure.WithOutputDir("../../test-results/allure")))

	// A component cannot consume an API that it provides itself.
	t.Run("RejectSelfConsumerAPIRelationship", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Consume component API")
		t.Severity(allure.SeverityNormal)
		t.Tags("e2e", "negative")
		t.Title("Reject a component consuming its own API")
		resetDatabase(t)

		createdProduct := createTestProductForComponent(t, client)
		provider, statusCode := createTestComponent(t, client, testBackendComponentRequest(createdProduct.ID, "Provider Component"))
		t.Require().Equal(http.StatusCreated, statusCode, "provider component is created")

		statusCode = addTestConsumerAPI(t, client, provider.ID, provider.APIs[0].ID)
		allure.Step(t, "verify self relationship rejection", func(t T) {
			t.Assert().Equal(http.StatusBadRequest, statusCode, "self relationship returns 400 Bad Request")
		})
	}, allure.WithOutputDir("../../test-results/allure")))

	t.Run("DeleteExistingComponent", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Delete component")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Delete existing component")
		resetDatabase(t)

		createdProduct := createTestProductForComponent(t, client)
		testRequest := testBackendComponentRequest(createdProduct.ID, "Test Component")
		createdComponent, statusCode := createTestComponent(t, client, testRequest)
		allure.Step(t, "verify prerequisite component", func(t T) {
			t.Require().Equal(http.StatusCreated, statusCode, "component creation returns 201 Created")
		})

		statusCode = deleteTestComponent(t, client, createdComponent.ID)
		allure.Step(t, "verify component deletion", func(t T) {
			t.Require().Equal(http.StatusNoContent, statusCode, "component deletion returns 204 No Content")
		})
	}, allure.WithOutputDir("../../test-results/allure")))

	// Deleting an unknown component must return a clear not-found response.
	t.Run("DeleteNonexistentComponent", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Delete component")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject deletion of nonexistent component")
		resetDatabase(t)

		statusCode := deleteTestComponent(t, client, 1)
		allure.Step(t, "verify deletion of missing component", func(t T) {
			t.Require().Equal(http.StatusNotFound, statusCode, "deleting a missing component returns 404 Not Found")
		})
	}, allure.WithOutputDir("../../test-results/allure")))
}

func createTestProductForComponent(t T, client *http.Client) product.ResponseV1 {
	t.Helper()

	workspace, statusCode := createTestWorkspace(t, environment.server.URL, client, "Component Test Workspace")
	allure.Step(t, "verify prerequisite workspace", func(t T) {
		t.Require().Equal(http.StatusCreated, statusCode, "workspace creation returns 201 Created")
	})

	testRequest := product.CreateRequestV1{
		Name:        "Component Test Product",
		Criticality: inventory.CriticalityMissionCritical,
		ProductCode: "COMP",
	}
	createdProduct, statusCode := createTestProduct(t, client, workspace.ID, testRequest)
	allure.Step(t, "verify prerequisite product", func(t T) {
		t.Require().Equal(http.StatusCreated, statusCode, "product creation returns 201 Created")
	})
	return createdProduct
}

func testBackendComponentRequest(productID int64, name string) component.CreateRequestV1 {
	description := "Backend component used by the component E2E tests"
	return component.CreateRequestV1{
		ProductID:   productID,
		Name:        name,
		Type:        inventory.ComponentTypeBackend,
		Description: &description,
		Details: json.RawMessage(`{
			"language": "Go",
			"language_version": "1.25",
			"framework": "Gin"
		}`),
		APIs: []component.APIRequestV1{
			{
				Name:            "Component API",
				APIType:         inventory.APITypeREST,
				NetworkExposure: inventory.NetworkExposureInternal,
			},
		},
	}
}

func createTestComponent(
	t T,
	client *http.Client,
	testRequest component.CreateRequestV1,
) (component.ResponseV1, int) {
	t.Helper()
	createRouteV1 := environment.server.URL + "/v1/components"
	requestBody, attachment := marshalRequestBody(t, testRequest)
	request, err := http.NewRequestWithContext(t.Context(), http.MethodPost, createRouteV1, requestBody)
	allure.Step(t, "build component creation request", func(t T) {
		t.Require().NoError(err, "component creation request is built without error")
	})
	request.Header.Set("Content-Type", "application/json")

	t.Attach(fmt.Sprintf("Send create %q component", testRequest.Name), allureJSONAttachment(t, attachment))

	response, err := client.Do(request)
	allure.Step(t, "send component creation request", func(t T) {
		t.Require().NoError(err, "component creation request is sent without error")
	})
	defer response.Body.Close()

	createdComponent, attachment := unmarshalResponseBody[component.ResponseV1](t, response)
	t.Attach("Received component response", allureJSONAttachment(t, attachment))
	return createdComponent, response.StatusCode
}

func deleteTestComponent(
	t T,
	client *http.Client,
	componentID int64,
) int {
	t.Helper()
	deleteRouteV1 := environment.server.URL + "/v1/components/" + strconv.FormatInt(componentID, 10)
	request, err := http.NewRequestWithContext(t.Context(), http.MethodDelete, deleteRouteV1, nil)
	allure.Step(t, "build component deletion request", func(t T) {
		t.Require().NoError(err, "component deletion request is built without error")
	})

	response, err := client.Do(request)
	allure.Step(t, "send component deletion request", func(t T) {
		t.Require().NoError(err, "component deletion request is sent without error")
	})
	defer response.Body.Close()
	return response.StatusCode
}

func addTestConsumerAPI(t T, client *http.Client, componentID, apiID int64) int {
	t.Helper()
	route := environment.server.URL + "/v1/components/" + strconv.FormatInt(componentID, 10) + "/consumer-apis"
	requestBody, attachment := marshalRequestBody(t, component.ConsumerAPICreateRequestV1{APIID: apiID})
	request, err := http.NewRequestWithContext(t.Context(), http.MethodPost, route, requestBody)
	t.Require().NoError(err, "consumer API relationship request is built without error")
	request.Header.Set("Content-Type", "application/json")
	t.Attach("Send consumer API relationship request", allureJSONAttachment(t, attachment))

	response, err := client.Do(request)
	t.Require().NoError(err, "consumer API relationship request is sent without error")
	defer response.Body.Close()
	return response.StatusCode
}

func getTestComponent(t T, client *http.Client, componentID int64) (component.ResponseV1, int) {
	t.Helper()
	route := environment.server.URL + "/v1/components/" + strconv.FormatInt(componentID, 10)
	request, err := http.NewRequestWithContext(t.Context(), http.MethodGet, route, nil)
	t.Require().NoError(err, "component retrieval request is built without error")

	response, err := client.Do(request)
	t.Require().NoError(err, "component retrieval request is sent without error")
	defer response.Body.Close()

	returnedComponent, attachment := unmarshalResponseBody[component.ResponseV1](t, response)
	t.Attach("Received component response", allureJSONAttachment(t, attachment))
	return returnedComponent, response.StatusCode
}
