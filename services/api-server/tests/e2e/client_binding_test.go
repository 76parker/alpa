package e2e_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"testing"

	"github.com/76parker/alpa/internal/domain/inventory"
	httpapis "github.com/76parker/alpa/internal/httpapi/apis"
	httpclients "github.com/76parker/alpa/internal/httpapi/clients"
	"github.com/76parker/alpa/internal/httpapi/errmap"
	"github.com/76parker/alpa/internal/httpapi/product"
	"github.com/ozontech/testo"
	allure "github.com/ozontech/testo-allure"
)

func TestClientBindingE2E(t *testing.T) {
	client := environment.server.Client()

	// A successful binding must be part of both aggregate read projections.
	t.Run("CreateAndReadBinding", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Client")
		t.Story("Bind client to API")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Create a client binding and restore it in component reads")

		resetDatabase(t)
		productID, sourceID, targetID := createBindingComponents(t, client)
		componentClient, status := createTestClient(t, client, sourceID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		t.Require().Nil(componentClient.APIID, "new client is explicitly unbound")
		api, status := createTestAPI(t, client, targetID, httpapis.CreateRequestV1{
			Name: "target", APIType: inventory.APITypeREST, NetworkExposure: inventory.NetworkExposureInternal,
		})
		t.Require().Equal(http.StatusCreated, status)

		result := createTestBinding(t, client, sourceID, componentClient.ID, api.ID)
		t.Require().Equal(http.StatusCreated, result.Status)
		t.Assert().Equal(httpclients.BindAPIResponseV1{ClientID: componentClient.ID, APIID: api.ID}, result.Binding)

		var storedAPIID *int64
		err := environment.postgres.pool.QueryRow(
			t.Context(),
			"SELECT api_id FROM inventory.component_clients WHERE id = $1",
			componentClient.ID,
		).Scan(&storedAPIID)
		t.Require().NoError(err)
		t.Require().NotNil(storedAPIID)
		t.Assert().Equal(api.ID, *storedAPIID, "binding is stored directly on the client")

		got, status := getTestComponent(t, client, sourceID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().Len(got.Clients, 1)
		t.Require().NotNil(got.Clients[0].APIID)
		t.Assert().Equal(api.ID, *got.Clients[0].APIID)

		listed, status := listTestComponents(t, client, productID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().Len(listed.Data, 2)
		t.Require().Len(listed.Data[0].Clients, 1)
		t.Require().NotNil(listed.Data[0].Clients[0].APIID)
		t.Assert().Equal(api.ID, *listed.Data[0].Clients[0].APIID)
	}, allureArtifactsDir))

	// The nullable foreign key is intentionally not unique: clients may share one target API.
	t.Run("AllowMultipleClientsForOneAPI", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Client")
		t.Story("Bind client to API")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Allow multiple clients to target the same API")

		resetDatabase(t)
		_, sourceID, targetID := createBindingComponents(t, client)
		firstClient, status := createTestClient(t, client, sourceID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		secondClient, status := createTestClient(t, client, sourceID, httpclients.CreateRequestV1{
			ClientName:        inventory.GraphQLClient,
			Role:              inventory.CallerRole,
			CommunicationType: inventory.RequestResponse,
		})
		t.Require().Equal(http.StatusCreated, status)
		api, status := createTestAPI(t, client, targetID, bindingAPIRequest("shared"))
		t.Require().Equal(http.StatusCreated, status)

		t.Require().Equal(http.StatusCreated, createTestBinding(t, client, sourceID, firstClient.ID, api.ID).Status)
		t.Require().Equal(http.StatusCreated, createTestBinding(t, client, sourceID, secondClient.ID, api.ID).Status)

		got, status := getTestComponent(t, client, sourceID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().Len(got.Clients, 2)
		t.Require().NotNil(got.Clients[0].APIID)
		t.Require().NotNil(got.Clients[1].APIID)
		t.Assert().Equal(api.ID, *got.Clients[0].APIID)
		t.Assert().Equal(api.ID, *got.Clients[1].APIID)
	}, allureArtifactsDir))

	// The client row lock serializes concurrent creates so exactly one target wins.
	t.Run("ConcurrentCreateDoesNotReplaceBinding", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Client")
		t.Story("Bind client to API")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject concurrent bindings without replacing the first target")

		resetDatabase(t)
		productID, sourceID, firstTargetID := createBindingComponents(t, client)
		secondTarget, status := createTestComponent(t, client, testBackendComponentRequest(productID, "Concurrent target"))
		t.Require().Equal(http.StatusCreated, status)
		componentClient, status := createTestClient(t, client, sourceID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		firstAPI, status := createTestAPI(t, client, firstTargetID, bindingAPIRequest("first concurrent"))
		t.Require().Equal(http.StatusCreated, status)
		secondAPI, status := createTestAPI(t, client, secondTarget.ID, bindingAPIRequest("second concurrent"))
		t.Require().Equal(http.StatusCreated, status)

		start := make(chan struct{})
		results := make(chan concurrentBindingResult, 2)
		for _, apiID := range []int64{firstAPI.ID, secondAPI.ID} {
			go func(apiID int64) {
				<-start
				status, err := sendBindingRequest(t.Context(), client, sourceID, componentClient.ID, apiID)
				results <- concurrentBindingResult{status: status, err: err}
			}(apiID)
		}
		close(start)

		statusCounts := make(map[int]int, 2)
		for range 2 {
			result := <-results
			t.Require().NoError(result.err)
			statusCounts[result.status]++
		}
		t.Assert().Equal(1, statusCounts[http.StatusCreated])
		t.Assert().Equal(1, statusCounts[http.StatusConflict])

		got, status := getTestComponent(t, client, sourceID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().NotNil(got.Clients[0].APIID)
		boundAPIID := *got.Clients[0].APIID
		t.Assert().True(boundAPIID == firstAPI.ID || boundAPIID == secondAPI.ID)
	}, allureArtifactsDir))

	// A second POST must conflict and leave the original target unchanged.
	t.Run("DuplicatePreservesOriginalBinding", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Client")
		t.Story("Bind client to API")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject duplicate binding and preserve the original API")

		resetDatabase(t)
		_, sourceID, firstTargetID := createBindingComponents(t, client)
		productID := getComponentProductID(t, sourceID)
		secondTarget, status := createTestComponent(t, client, testBackendComponentRequest(productID, "Second target"))
		t.Require().Equal(http.StatusCreated, status)
		componentClient, status := createTestClient(t, client, sourceID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		firstAPI, status := createTestAPI(t, client, firstTargetID, bindingAPIRequest("first"))
		t.Require().Equal(http.StatusCreated, status)
		secondAPI, status := createTestAPI(t, client, secondTarget.ID, bindingAPIRequest("second"))
		t.Require().Equal(http.StatusCreated, status)

		first := createTestBinding(t, client, sourceID, componentClient.ID, firstAPI.ID)
		t.Require().Equal(http.StatusCreated, first.Status)
		duplicate := createTestBinding(t, client, sourceID, componentClient.ID, secondAPI.ID)
		t.Require().Equal(http.StatusConflict, duplicate.Status)
		t.Assert().Equal(errmap.CodeClientAlreadyBound, duplicate.Failure.Code)

		got, status := getTestComponent(t, client, sourceID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().NotNil(got.Clients[0].APIID)
		t.Assert().Equal(firstAPI.ID, *got.Clients[0].APIID)
	}, allureArtifactsDir))

	// Same-component and cross-product edges violate the inventory boundary.
	t.Run("RejectSelfAndCrossProductBindings", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Client")
		t.Story("Validate client API scope")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject self-component and cross-product API bindings")

		resetDatabase(t)
		firstProduct := createTestProductForComponent(t, client)
		source, status := createTestComponent(t, client, testBackendComponentRequest(firstProduct.ID, "Source"))
		t.Require().Equal(http.StatusCreated, status)
		componentClient, status := createTestClient(t, client, source.ID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		selfAPI, status := createTestAPI(t, client, source.ID, bindingAPIRequest("self"))
		t.Require().Equal(http.StatusCreated, status)
		self := createTestBinding(t, client, source.ID, componentClient.ID, selfAPI.ID)
		t.Require().Equal(http.StatusBadRequest, self.Status)
		t.Assert().Equal(errmap.CodeInvalidClientBinding, self.Failure.Code)

		workspace, status := createTestWorkspace(t, environment.server.URL, client, "Other workspace")
		t.Require().Equal(http.StatusCreated, status)
		otherProduct, status := createTestProduct(t, client, workspace.ID, product.CreateRequestV1{
			Name: "Other product", ProductCode: "OTHER", Criticality: inventory.CriticalityBusinessCritical,
		})
		t.Require().Equal(http.StatusCreated, status)
		otherComponent, status := createTestComponent(t, client, testBackendComponentRequest(otherProduct.ID, "Other target"))
		t.Require().Equal(http.StatusCreated, status)
		otherAPI, status := createTestAPI(t, client, otherComponent.ID, bindingAPIRequest("cross-product"))
		t.Require().Equal(http.StatusCreated, status)
		crossProduct := createTestBinding(t, client, source.ID, componentClient.ID, otherAPI.ID)
		t.Require().Equal(http.StatusBadRequest, crossProduct.Status)
		t.Assert().Equal(errmap.CodeInvalidClientBinding, crossProduct.Failure.Code)
	}, allureArtifactsDir))

	// Missing resources and route/client ownership mismatches are intentionally indistinguishable.
	t.Run("ReturnNotFoundForMissingOrMismatchedResources", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Client")
		t.Story("Bind client to API")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Return not found for missing or mismatched binding resources")

		resetDatabase(t)
		_, sourceID, targetID := createBindingComponents(t, client)
		componentClient, status := createTestClient(t, client, sourceID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		api, status := createTestAPI(t, client, targetID, bindingAPIRequest("target"))
		t.Require().Equal(http.StatusCreated, status)

		cases := []struct {
			name        string
			componentID int64
			clientID    int64
			apiID       int64
		}{
			{name: "missing component", componentID: 999, clientID: componentClient.ID, apiID: api.ID},
			{name: "missing client", componentID: sourceID, clientID: 999, apiID: api.ID},
			{name: "missing api", componentID: sourceID, clientID: componentClient.ID, apiID: 999},
			{name: "client belongs to another route component", componentID: targetID, clientID: componentClient.ID, apiID: api.ID},
		}
		for _, tc := range cases {
			result := createTestBinding(t, client, tc.componentID, tc.clientID, tc.apiID)
			t.Require().Equal(http.StatusNotFound, result.Status, tc.name)
			t.Assert().Equal(errmap.CodeNotFound, result.Failure.Code, tc.name)
		}
	}, allureArtifactsDir))

	// ON DELETE SET NULL removes only the edge, preserving the source client.
	t.Run("DeletingAPIRemovesBinding", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Client")
		t.Story("Unbind client when API is deleted")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Clear a client API binding when the target API is deleted")

		resetDatabase(t)
		_, sourceID, targetID := createBindingComponents(t, client)
		componentClient, status := createTestClient(t, client, sourceID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, status)
		api, status := createTestAPI(t, client, targetID, bindingAPIRequest("target"))
		t.Require().Equal(http.StatusCreated, status)
		t.Require().Equal(http.StatusCreated, createTestBinding(t, client, sourceID, componentClient.ID, api.ID).Status)

		_, err := environment.postgres.pool.Exec(t.Context(), "DELETE FROM inventory.apis WHERE id = $1", api.ID)
		t.Require().NoError(err)
		got, status := getTestComponent(t, client, sourceID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().Len(got.Clients, 1)
		t.Assert().Nil(got.Clients[0].APIID)
	}, allureArtifactsDir))
}

type bindingResult struct {
	Binding httpclients.BindAPIResponseV1
	Failure errmap.Error
	Status  int
}

type concurrentBindingResult struct {
	status int
	err    error
}

func createTestBinding(t T, client *http.Client, componentID, clientID, apiID int64) bindingResult {
	t.Helper()
	route := environment.server.URL + "/v1/components/" + strconv.FormatInt(componentID, 10) +
		"/clients/" + strconv.FormatInt(clientID, 10) + "/bindings"
	body, _ := marshalRequestBody(t, httpclients.BindAPIRequestV1{APIID: apiID})
	request, err := http.NewRequestWithContext(t.Context(), http.MethodPost, route, body)
	t.Require().NoError(err)
	request.Header.Set("Content-Type", "application/json")
	response, err := client.Do(request)
	t.Require().NoError(err)
	defer response.Body.Close()
	encoded, err := io.ReadAll(response.Body)
	t.Require().NoError(err)
	result := bindingResult{Status: response.StatusCode}
	if response.StatusCode == http.StatusCreated {
		t.Require().NoError(json.Unmarshal(encoded, &result.Binding))
		return result
	}
	t.Require().NoError(json.Unmarshal(encoded, &result.Failure))
	return result
}

func sendBindingRequest(
	ctx context.Context,
	client *http.Client,
	componentID int64,
	clientID int64,
	apiID int64,
) (int, error) {
	route := environment.server.URL + "/v1/components/" + strconv.FormatInt(componentID, 10) +
		"/clients/" + strconv.FormatInt(clientID, 10) + "/bindings"
	body, err := json.Marshal(httpclients.BindAPIRequestV1{APIID: apiID})
	if err != nil {
		return 0, err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, route, bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := client.Do(request)
	if err != nil {
		return 0, err
	}
	defer response.Body.Close()
	_, err = io.Copy(io.Discard, response.Body)
	return response.StatusCode, err
}

func createBindingComponents(t T, client *http.Client) (int64, int64, int64) {
	t.Helper()
	createdProduct := createTestProductForComponent(t, client)
	source, status := createTestComponent(t, client, testBackendComponentRequest(createdProduct.ID, "Source"))
	t.Require().Equal(http.StatusCreated, status)
	target, status := createTestComponent(t, client, testBackendComponentRequest(createdProduct.ID, "Target"))
	t.Require().Equal(http.StatusCreated, status)
	return createdProduct.ID, source.ID, target.ID
}

func bindingAPIRequest(name string) httpapis.CreateRequestV1 {
	return httpapis.CreateRequestV1{
		Name: name, APIType: inventory.APITypeREST, NetworkExposure: inventory.NetworkExposureInternal,
	}
}

func getComponentProductID(t T, componentID int64) int64 {
	t.Helper()
	var productID int64
	err := environment.postgres.pool.QueryRow(t.Context(), "SELECT product_id FROM inventory.components WHERE id = $1", componentID).Scan(&productID)
	t.Require().NoError(err)
	return productID
}
