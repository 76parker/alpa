package e2e_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"testing"

	"github.com/76parker/alpa/internal/domain/inventory"
	httpapis "github.com/76parker/alpa/internal/httpapi/apis"
	httpclients "github.com/76parker/alpa/internal/httpapi/clients"
	"github.com/76parker/alpa/internal/httpapi/errmap"
	httpintegrations "github.com/76parker/alpa/internal/httpapi/integrations"
	"github.com/76parker/alpa/internal/httpapi/product"
	"github.com/ozontech/testo"
	allure "github.com/ozontech/testo-allure"
)

func TestIntegrationE2E(t *testing.T) {
	client := environment.server.Client()

	t.Run("CreateMultipleIntegrationsAndReadThem", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Integration")
		t.Story("Create integration")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Create multiple integrations for one client and expose them in component reads")

		resetDatabase(t)
		productID, sourceID, targetID := createIntegrationComponents(t, client)
		componentClient, status := createTestClient(t, client, sourceID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		firstAPI, status := createTestAPI(t, client, targetID, integrationAPIRequest())
		t.Require().Equal(http.StatusCreated, status)
		secondAPI, status := createTestAPI(t, client, targetID, integrationAPIRequest())
		t.Require().Equal(http.StatusCreated, status)

		firstDescription := "Calls the first API"
		first := createTestIntegration(t, client, httpintegrations.CreateRequestV1{
			ClientID: componentClient.ID, APIID: firstAPI.ID,
			Action: inventory.Call, Description: &firstDescription,
		})
		t.Require().Equal(http.StatusCreated, first.Status)
		second := createTestIntegration(t, client, httpintegrations.CreateRequestV1{
			ClientID: componentClient.ID, APIID: secondAPI.ID,
			Action: inventory.Call,
		})
		t.Require().Equal(http.StatusCreated, second.Status)
		t.Assert().Greater(first.Integration.ID, int64(0))
		t.Assert().Equal(componentClient.ID, first.Integration.ClientID)
		t.Assert().Equal(firstAPI.ID, first.Integration.APIID)
		t.Assert().Equal(firstDescription, *first.Integration.Description)

		stored, status := getTestComponent(t, client, sourceID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().Len(stored.Clients, 1)
		t.Require().Len(stored.Clients[0].Integrations, 2)
		t.Assert().Equal(
			[]int64{first.Integration.ID, second.Integration.ID},
			[]int64{stored.Clients[0].Integrations[0].ID, stored.Clients[0].Integrations[1].ID},
		)

		listed, status := listTestComponents(t, client, productID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().Len(listed.Data, 2)
		t.Assert().Equal(stored.Clients[0].Integrations, listed.Data[0].Clients[0].Integrations)

		secondClient, status := createTestClient(t, client, sourceID, httpclients.CreateRequestV1{
			ClientName: inventory.GraphQLClient,
		})
		t.Require().Equal(http.StatusCreated, status)
		shared := createTestIntegration(t, client, httpintegrations.CreateRequestV1{
			ClientID: secondClient.ID, APIID: firstAPI.ID, Action: inventory.Call,
		})
		t.Assert().Equal(http.StatusCreated, shared.Status, "one API may be used by multiple clients")
	}, allureArtifactsDir))

	t.Run("SupportEveryCompatibleAction", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Integration")
		t.Story("Validate client action")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Accept actions compatible with synchronous, event and streaming clients")

		resetDatabase(t)
		_, sourceID, targetID := createIntegrationComponents(t, client)
		firstAPI, status := createTestAPI(t, client, targetID, integrationAPIRequest())
		t.Require().Equal(http.StatusCreated, status)
		secondAPI, status := createTestAPI(t, client, targetID, integrationAPIRequest())
		t.Require().Equal(http.StatusCreated, status)

		syncClient, status := createTestClient(t, client, sourceID, httpclients.CreateRequestV1{
			ClientName: inventory.RESTClient,
		})
		t.Require().Equal(http.StatusCreated, status)
		eventClient, status := createTestClient(t, client, sourceID, httpclients.CreateRequestV1{
			ClientName: inventory.KafkaClient,
		})
		t.Require().Equal(http.StatusCreated, status)
		streamClient, status := createTestClient(t, client, sourceID, httpclients.CreateRequestV1{
			ClientName: inventory.WebSocketClient,
		})
		t.Require().Equal(http.StatusCreated, status)

		cases := []struct {
			name     string
			clientID int64
			action   inventory.ClientAction
			apiID    int64
		}{
			{name: "sync call", clientID: syncClient.ID, action: inventory.Call, apiID: firstAPI.ID},
			{name: "event produce", clientID: eventClient.ID, action: inventory.Produce, apiID: firstAPI.ID},
			{name: "event consume", clientID: eventClient.ID, action: inventory.Consume, apiID: secondAPI.ID},
			{name: "stream listen", clientID: streamClient.ID, action: inventory.ListenEvents, apiID: firstAPI.ID},
		}
		for _, tc := range cases {
			allure.Step(t, tc.name, func(t T) {
				result := createTestIntegration(t, client, httpintegrations.CreateRequestV1{
					ClientID: tc.clientID, APIID: tc.apiID, Action: tc.action,
				})
				t.Require().Equal(http.StatusCreated, result.Status)
				t.Assert().Equal(tc.action, result.Integration.Action)
			})
		}
	}, allureArtifactsDir))

	t.Run("UpdateClearAndDeleteDescription", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Integration")
		t.Story("Manage integration")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Update and clear integration description, then delete the integration")

		resetDatabase(t)
		_, sourceID, targetID := createIntegrationComponents(t, client)
		componentClient, status := createTestClient(t, client, sourceID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		api, status := createTestAPI(t, client, targetID, integrationAPIRequest())
		t.Require().Equal(http.StatusCreated, status)
		created := createTestIntegration(t, client, httpintegrations.CreateRequestV1{
			ClientID: componentClient.ID, APIID: api.ID, Action: inventory.Call,
		})
		t.Require().Equal(http.StatusCreated, created.Status)

		updated := patchTestIntegration(t, client, created.Integration.ID, map[string]any{"description": "Updated"})
		t.Require().Equal(http.StatusOK, updated.Status)
		t.Require().NotNil(updated.Integration.Description)
		t.Assert().Equal("Updated", *updated.Integration.Description)
		stored, status := getTestComponent(t, client, sourceID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().Len(stored.Clients[0].Integrations, 1)
		t.Require().NotNil(stored.Clients[0].Integrations[0].Description)
		t.Assert().Equal("Updated", *stored.Clients[0].Integrations[0].Description)

		cleared := patchTestIntegration(t, client, created.Integration.ID, map[string]any{"description": nil})
		t.Require().Equal(http.StatusOK, cleared.Status)
		t.Assert().Nil(cleared.Integration.Description)
		stored, status = getTestComponent(t, client, sourceID)
		t.Require().Equal(http.StatusOK, status)
		t.Assert().Nil(stored.Clients[0].Integrations[0].Description)

		t.Require().Equal(http.StatusNoContent, deleteTestIntegration(t, client, created.Integration.ID))
		stored, status = getTestComponent(t, client, sourceID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().Len(stored.Clients, 1)
		t.Assert().Empty(stored.Clients[0].Integrations)
	}, allureArtifactsDir))

	t.Run("RejectDuplicateAndConcurrentCreation", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Integration")
		t.Story("Enforce integration uniqueness")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject duplicate client and API pairs, including concurrent requests")

		resetDatabase(t)
		_, sourceID, targetID := createIntegrationComponents(t, client)
		componentClient, status := createTestClient(t, client, sourceID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		api, status := createTestAPI(t, client, targetID, integrationAPIRequest())
		t.Require().Equal(http.StatusCreated, status)
		request := httpintegrations.CreateRequestV1{
			ClientID: componentClient.ID, APIID: api.ID, Action: inventory.Call,
		}
		first := createTestIntegration(t, client, request)
		t.Require().Equal(http.StatusCreated, first.Status)
		duplicate := createTestIntegration(t, client, request)
		t.Require().Equal(http.StatusConflict, duplicate.Status)
		t.Assert().Equal(errmap.CodeIntegrationAlreadyExists, duplicate.Failure.Code)

		resetDatabase(t)
		_, sourceID, targetID = createIntegrationComponents(t, client)
		componentClient, status = createTestClient(t, client, sourceID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		api, status = createTestAPI(t, client, targetID, integrationAPIRequest())
		t.Require().Equal(http.StatusCreated, status)
		request = httpintegrations.CreateRequestV1{ClientID: componentClient.ID, APIID: api.ID, Action: inventory.Call}

		start := make(chan struct{})
		results := make(chan concurrentIntegrationResult, 2)
		for range 2 {
			go func() {
				<-start
				status, err := sendIntegrationRequest(t.Context(), client, request)
				results <- concurrentIntegrationResult{status: status, err: err}
			}()
		}
		close(start)
		counts := make(map[int]int, 2)
		for range 2 {
			result := <-results
			t.Require().NoError(result.err)
			counts[result.status]++
		}
		t.Assert().Equal(1, counts[http.StatusCreated])
		t.Assert().Equal(1, counts[http.StatusConflict])
	}, allureArtifactsDir))

	t.Run("RejectInvalidScopeActionAndResources", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Integration")
		t.Story("Validate integration")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject invalid action, component scope, product scope and missing resources")

		resetDatabase(t)
		_, sourceID, targetID := createIntegrationComponents(t, client)
		restClient, status := createTestClient(t, client, sourceID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		api, status := createTestAPI(t, client, targetID, integrationAPIRequest())
		t.Require().Equal(http.StatusCreated, status)

		invalidAction := createTestIntegration(t, client, httpintegrations.CreateRequestV1{
			ClientID: restClient.ID, APIID: api.ID, Action: inventory.Produce,
		})
		t.Require().Equal(http.StatusBadRequest, invalidAction.Status)
		t.Assert().Equal(errmap.CodeInvalidClientAction, invalidAction.Failure.Code)
		unknownAction := createTestIntegration(t, client, httpintegrations.CreateRequestV1{
			ClientID: restClient.ID, APIID: api.ID, Action: inventory.ClientAction("unknown"),
		})
		t.Require().Equal(http.StatusBadRequest, unknownAction.Status)
		t.Assert().Equal(errmap.CodeInvalidClientAction, unknownAction.Failure.Code)

		selfAPI, status := createTestAPI(t, client, sourceID, integrationAPIRequest())
		t.Require().Equal(http.StatusCreated, status)
		self := createTestIntegration(t, client, httpintegrations.CreateRequestV1{
			ClientID: restClient.ID, APIID: selfAPI.ID, Action: inventory.Call,
		})
		t.Require().Equal(http.StatusBadRequest, self.Status)
		t.Assert().Equal(errmap.CodeInvalidIntegration, self.Failure.Code)

		workspace, status := createTestWorkspace(t, environment.server.URL, client, "Other workspace")
		t.Require().Equal(http.StatusCreated, status)
		otherProduct, status := createTestProduct(t, client, workspace.ID, product.CreateRequestV1{
			Name: "Other product", ProductCode: "OTHER", Criticality: inventory.CriticalityBusinessCritical,
		})
		t.Require().Equal(http.StatusCreated, status)
		otherComponent, status := createTestComponent(t, client, testBackendComponentRequest(otherProduct.ID, "Other target"))
		t.Require().Equal(http.StatusCreated, status)
		otherAPI, status := createTestAPI(t, client, otherComponent.ID, integrationAPIRequest())
		t.Require().Equal(http.StatusCreated, status)
		crossProduct := createTestIntegration(t, client, httpintegrations.CreateRequestV1{
			ClientID: restClient.ID, APIID: otherAPI.ID, Action: inventory.Call,
		})
		t.Require().Equal(http.StatusBadRequest, crossProduct.Status)
		t.Assert().Equal(errmap.CodeInvalidIntegration, crossProduct.Failure.Code)

		for _, request := range []httpintegrations.CreateRequestV1{
			{ClientID: 999, APIID: api.ID, Action: inventory.Call},
			{ClientID: restClient.ID, APIID: 999, Action: inventory.Call},
		} {
			missing := createTestIntegration(t, client, request)
			t.Require().Equal(http.StatusNotFound, missing.Status)
			t.Assert().Equal(errmap.CodeNotFound, missing.Failure.Code)
		}
		missingIntegration := patchTestIntegration(t, client, 999, map[string]any{"description": "missing"})
		t.Require().Equal(http.StatusNotFound, missingIntegration.Status)
		t.Assert().Equal(errmap.CodeNotFound, missingIntegration.Failure.Code)
		t.Assert().Equal(http.StatusNotFound, deleteTestIntegration(t, client, 999))
	}, allureArtifactsDir))

	t.Run("ValidateDescriptionAndClientUpdates", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Integration")
		t.Story("Protect integration invariants")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject invalid descriptions and client changes that invalidate integrations")

		resetDatabase(t)
		_, sourceID, targetID := createIntegrationComponents(t, client)
		restClient, status := createTestClient(t, client, sourceID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		api, status := createTestAPI(t, client, targetID, integrationAPIRequest())
		t.Require().Equal(http.StatusCreated, status)
		created := createTestIntegration(t, client, httpintegrations.CreateRequestV1{
			ClientID: restClient.ID, APIID: api.ID, Action: inventory.Call,
		})
		t.Require().Equal(http.StatusCreated, created.Status)

		missingDescription := patchTestIntegration(t, client, created.Integration.ID, map[string]any{})
		t.Require().Equal(http.StatusBadRequest, missingDescription.Status)
		t.Assert().Equal(errmap.CodeInvalidRequest, missingDescription.Failure.Code)
		tooLong := patchTestIntegration(t, client, created.Integration.ID, map[string]any{
			"description": strings.Repeat("a", 1001),
		})
		t.Require().Equal(http.StatusBadRequest, tooLong.Status)
		t.Assert().Equal(errmap.CodeInvalidRequest, tooLong.Failure.Code)

		mismatchedComponent := updateTestClient(t, client, targetID, restClient.ID, httpclients.UpdateRequestV1{
			ClientName: inventory.KafkaClient,
		})
		t.Require().Equal(http.StatusNotFound, mismatchedComponent.Status)
		t.Assert().Equal(errmap.CodeNotFound, mismatchedComponent.Failure.Code)

		update := updateTestClient(t, client, sourceID, restClient.ID, httpclients.UpdateRequestV1{
			ClientName: inventory.KafkaClient,
		})
		t.Require().Equal(http.StatusConflict, update.Status)
		t.Assert().Equal(errmap.CodeIncompatibleClientIntegrations, update.Failure.Code)

		stored, status := getTestComponent(t, client, sourceID)
		t.Require().Equal(http.StatusOK, status)
		t.Assert().Equal(inventory.RESTClient, stored.Clients[0].ClientName)
	}, allureArtifactsDir))
}

type integrationResult struct {
	Integration httpintegrations.ResponseV1
	Failure     errmap.Error
	Status      int
}

type concurrentIntegrationResult struct {
	status int
	err    error
}

type clientUpdateResult struct {
	Client  httpclients.ResponseV1
	Failure errmap.Error
	Status  int
}

func createTestIntegration(t T, client *http.Client, request httpintegrations.CreateRequestV1) integrationResult {
	t.Helper()
	body, attachment := marshalRequestBody(t, request)
	httpRequest, err := http.NewRequestWithContext(t.Context(), http.MethodPost, environment.server.URL+"/v1/integrations", body)
	t.Require().NoError(err)
	httpRequest.Header.Set("Content-Type", "application/json")
	t.Attach("Send integration creation request", allureJSONAttachment(t, attachment))
	return executeIntegrationRequest(t, client, httpRequest, http.StatusCreated)
}

func patchTestIntegration(t T, client *http.Client, integrationID int64, request map[string]any) integrationResult {
	t.Helper()
	body, attachment := marshalRequestBody(t, request)
	httpRequest, err := http.NewRequestWithContext(
		t.Context(), http.MethodPatch,
		environment.server.URL+"/v1/integrations/"+strconv.FormatInt(integrationID, 10), body,
	)
	t.Require().NoError(err)
	httpRequest.Header.Set("Content-Type", "application/json")
	t.Attach("Send integration update request", allureJSONAttachment(t, attachment))
	return executeIntegrationRequest(t, client, httpRequest, http.StatusOK)
}

func executeIntegrationRequest(t T, client *http.Client, request *http.Request, successStatus int) integrationResult {
	response, err := client.Do(request)
	t.Require().NoError(err)
	defer response.Body.Close()
	result := integrationResult{Status: response.StatusCode}
	if response.StatusCode == successStatus {
		result.Integration, _ = unmarshalResponseBody[httpintegrations.ResponseV1](t, response)
		return result
	}
	result.Failure, _ = unmarshalResponseBody[errmap.Error](t, response)
	return result
}

func deleteTestIntegration(t T, client *http.Client, integrationID int64) int {
	t.Helper()
	request, err := http.NewRequestWithContext(
		t.Context(), http.MethodDelete,
		environment.server.URL+"/v1/integrations/"+strconv.FormatInt(integrationID, 10), nil,
	)
	t.Require().NoError(err)
	response, err := client.Do(request)
	t.Require().NoError(err)
	defer response.Body.Close()
	_, err = io.Copy(io.Discard, response.Body)
	t.Require().NoError(err)
	return response.StatusCode
}

func sendIntegrationRequest(ctx context.Context, client *http.Client, request httpintegrations.CreateRequestV1) (int, error) {
	body, err := json.Marshal(request)
	if err != nil {
		return 0, err
	}
	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, environment.server.URL+"/v1/integrations", bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	httpRequest.Header.Set("Content-Type", "application/json")
	response, err := client.Do(httpRequest)
	if err != nil {
		return 0, err
	}
	defer response.Body.Close()
	_, err = io.Copy(io.Discard, response.Body)
	return response.StatusCode, err
}

func updateTestClient(
	t T,
	client *http.Client,
	componentID int64,
	clientID int64,
	request httpclients.UpdateRequestV1,
) clientUpdateResult {
	t.Helper()
	body, _ := marshalRequestBody(t, request)
	httpRequest, err := http.NewRequestWithContext(
		t.Context(), http.MethodPut,
		environment.server.URL+"/v1/components/"+strconv.FormatInt(componentID, 10)+"/clients/"+strconv.FormatInt(clientID, 10), body,
	)
	t.Require().NoError(err)
	httpRequest.Header.Set("Content-Type", "application/json")
	response, err := client.Do(httpRequest)
	t.Require().NoError(err)
	defer response.Body.Close()
	result := clientUpdateResult{Status: response.StatusCode}
	if response.StatusCode == http.StatusOK {
		result.Client, _ = unmarshalResponseBody[httpclients.ResponseV1](t, response)
		return result
	}
	result.Failure, _ = unmarshalResponseBody[errmap.Error](t, response)
	return result
}

func createIntegrationComponents(t T, client *http.Client) (int64, int64, int64) {
	t.Helper()
	createdProduct := createTestProductForComponent(t, client)
	source, status := createTestComponent(t, client, testBackendComponentRequest(createdProduct.ID, "Source"))
	t.Require().Equal(http.StatusCreated, status)
	target, status := createTestComponent(t, client, testBackendComponentRequest(createdProduct.ID, "Target"))
	t.Require().Equal(http.StatusCreated, status)
	return createdProduct.ID, source.ID, target.ID
}

func integrationAPIRequest() httpapis.CreateRequestV1 {
	return httpapis.CreateRequestV1{
		Name: "Integration API", APIType: inventory.REST, NetworkExposure: inventory.InternalExposure,
	}
}
