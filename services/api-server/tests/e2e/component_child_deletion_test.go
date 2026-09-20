package e2e_test

import (
	"net/http"
	"strconv"
	"testing"

	"github.com/76parker/alpa/internal/domain/inventory"
	httpapis "github.com/76parker/alpa/internal/httpapi/apis"
	"github.com/ozontech/testo"
	allure "github.com/ozontech/testo-allure"
)

func TestComponentChildDeletionE2E(t *testing.T) {
	client := environment.server.Client()

	// An API deletion removes only the API and unbinds clients that referenced it.
	t.Run("DeleteAPI", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("API")
		t.Story("Delete API")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Delete an API owned by a component")
		resetDatabase(t)

		_, sourceComponentID, targetComponentID := createBindingComponents(t, client)
		componentClient, statusCode := createTestClient(t, client, sourceComponentID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, statusCode)
		api, statusCode := createTestAPI(t, client, targetComponentID, httpapis.CreateRequestV1{
			Name:            "target",
			APIType:         inventory.REST,
			NetworkExposure: inventory.InternalExposure,
		})
		t.Require().Equal(http.StatusCreated, statusCode)
		t.Require().Equal(http.StatusCreated, createTestBinding(t, client, sourceComponentID, componentClient.ID, api.ID).Status)

		statusCode = deleteTestAPI(t, client, targetComponentID, api.ID)
		t.Require().Equal(http.StatusNoContent, statusCode)

		target, statusCode := getTestComponent(t, client, targetComponentID)
		t.Require().Equal(http.StatusOK, statusCode)
		t.Assert().Empty(target.APIs)
		source, statusCode := getTestComponent(t, client, sourceComponentID)
		t.Require().Equal(http.StatusOK, statusCode)
		t.Require().Len(source.Clients, 1)
		t.Assert().Nil(source.Clients[0].APIID)
	}, allureArtifactsDir))

	// A client deletion removes only the selected client from its owning component.
	t.Run("DeleteClient", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Client")
		t.Story("Delete client")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Delete a client owned by a component")
		resetDatabase(t)

		product := createTestProductForComponent(t, client)
		component, statusCode := createTestComponent(t, client, testBackendComponentRequest(product.ID, "Orders"))
		t.Require().Equal(http.StatusCreated, statusCode)
		firstClient, statusCode := createTestClient(t, client, component.ID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, statusCode)
		secondClient, statusCode := createTestClient(t, client, component.ID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, statusCode)

		statusCode = deleteTestClient(t, client, component.ID, firstClient.ID)
		t.Require().Equal(http.StatusNoContent, statusCode)

		stored, statusCode := getTestComponent(t, client, component.ID)
		t.Require().Equal(http.StatusOK, statusCode)
		t.Require().Len(stored.Clients, 1)
		t.Assert().Equal(secondClient.ID, stored.Clients[0].ID)
	}, allureArtifactsDir))

	// The parent ID in the route must scope deletion to resources it owns.
	t.Run("RejectMismatchedComponent", testo.Test(func(t T) {
		resetDatabase(t)
		product := createTestProductForComponent(t, client)
		first, statusCode := createTestComponent(t, client, testBackendComponentRequest(product.ID, "First"))
		t.Require().Equal(http.StatusCreated, statusCode)
		second, statusCode := createTestComponent(t, client, testBackendComponentRequest(product.ID, "Second"))
		t.Require().Equal(http.StatusCreated, statusCode)
		api, statusCode := createTestAPI(t, client, first.ID, httpapis.CreateRequestV1{
			Name:            "first",
			APIType:         inventory.REST,
			NetworkExposure: inventory.InternalExposure,
		})
		t.Require().Equal(http.StatusCreated, statusCode)
		componentClient, statusCode := createTestClient(t, client, first.ID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, statusCode)

		t.Assert().Equal(http.StatusNotFound, deleteTestAPI(t, client, second.ID, api.ID))
		t.Assert().Equal(http.StatusNotFound, deleteTestClient(t, client, second.ID, componentClient.ID))

		stored, statusCode := getTestComponent(t, client, first.ID)
		t.Require().Equal(http.StatusOK, statusCode)
		t.Assert().Len(stored.APIs, 1)
		t.Assert().Len(stored.Clients, 1)
	}, allureArtifactsDir))
}

func deleteTestAPI(t T, client *http.Client, componentID int64, apiID int64) int {
	t.Helper()

	request, err := http.NewRequestWithContext(
		t.Context(),
		http.MethodDelete,
		environment.server.URL+"/v1/components/"+strconv.FormatInt(componentID, 10)+"/apis/"+strconv.FormatInt(apiID, 10),
		nil,
	)
	t.Require().NoError(err)
	response, err := client.Do(request)
	t.Require().NoError(err)
	defer response.Body.Close()
	return response.StatusCode
}

func deleteTestClient(t T, client *http.Client, componentID int64, clientID int64) int {
	t.Helper()

	request, err := http.NewRequestWithContext(
		t.Context(),
		http.MethodDelete,
		environment.server.URL+"/v1/components/"+strconv.FormatInt(componentID, 10)+"/clients/"+strconv.FormatInt(clientID, 10),
		nil,
	)
	t.Require().NoError(err)
	response, err := client.Do(request)
	t.Require().NoError(err)
	defer response.Body.Close()
	return response.StatusCode
}
