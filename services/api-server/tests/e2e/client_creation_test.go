package e2e_test

import (
	"net/http"
	"strconv"
	"testing"

	"github.com/76parker/alpa/internal/domain/inventory"
	httpclients "github.com/76parker/alpa/internal/httpapi/clients"
	"github.com/76parker/alpa/internal/httpapi/errmap"
	"github.com/ozontech/testo"
	allure "github.com/ozontech/testo-allure"
)

func TestClientCreationE2E(t *testing.T) {
	client := environment.server.Client()

	// The persisted client and every aggregate read must retain each flat client attribute.
	t.Run("CreateFlatClientsAndReadThemBack", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Client")
		t.Story("Create client")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Create flat client types and preserve them in read projections")

		resetDatabase(t)
		product := createTestProductForComponent(t, client)
		component, status := createTestComponent(t, client, testBackendComponentRequest(product.ID, "Client source"))
		t.Require().Equal(http.StatusCreated, status)

		cases := []struct {
			name                  string
			request               httpclients.CreateRequestV1
			wantCommunicationType inventory.CommunicationType
		}{
			{
				name: "sync REST client",
				request: httpclients.CreateRequestV1{
					ClientName: inventory.RESTClient,
				},
				wantCommunicationType: inventory.RequestResponse,
			},
			{
				name: "async Kafka producer",
				request: httpclients.CreateRequestV1{
					ClientName: inventory.KafkaClient,
				},
				wantCommunicationType: inventory.Events,
			},
			{
				name: "streaming WebSocket listener",
				request: httpclients.CreateRequestV1{
					ClientName: inventory.WebSocketClient,
				},
				wantCommunicationType: inventory.Stream,
			},
			{
				name: "S3 client",
				request: httpclients.CreateRequestV1{
					ClientName: inventory.S3Client,
				},
				wantCommunicationType: inventory.RequestResponse,
			},
		}

		for _, tc := range cases {
			allure.Step(t, tc.name, func(t T) {
				created, status := createTestClient(t, client, component.ID, tc.request)
				t.Require().Equal(http.StatusCreated, status)
				t.Assert().Equal(tc.request.ClientName, created.ClientName)
				t.Assert().Equal(tc.wantCommunicationType, created.CommunicationType)

				var storedName, storedCommunicationType string
				err := environment.postgres.pool.QueryRow(
					t.Context(),
					"SELECT client_name, communication_type FROM inventory.component_clients WHERE id = $1",
					created.ID,
				).Scan(&storedName, &storedCommunicationType)
				t.Require().NoError(err)
				t.Assert().Equal(string(tc.request.ClientName), storedName)
				t.Assert().Equal(string(tc.wantCommunicationType), storedCommunicationType)
			})
		}

		returned, status := getTestComponent(t, client, component.ID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().Len(returned.Clients, len(cases))
		for i, tc := range cases {
			t.Assert().Equal(tc.request.ClientName, returned.Clients[i].ClientName)
			t.Assert().Equal(tc.wantCommunicationType, returned.Clients[i].CommunicationType)
			t.Assert().Empty(returned.Clients[i].Integrations)
		}

		listed, status := listTestComponents(t, client, product.ID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().Len(listed.Data, 1)
		t.Require().Len(listed.Data[0].Clients, len(cases))
		for i, tc := range cases {
			t.Assert().Equal(tc.request.ClientName, listed.Data[0].Clients[i].ClientName)
			t.Assert().Equal(tc.wantCommunicationType, listed.Data[0].Clients[i].CommunicationType)
			t.Assert().Empty(listed.Data[0].Clients[i].Integrations)
		}
	}, allureArtifactsDir))

	t.Run("RejectUnknownClientType", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Client")
		t.Story("Create client")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject an unknown client type")

		resetDatabase(t)
		product := createTestProductForComponent(t, client)
		component, status := createTestComponent(t, client, testBackendComponentRequest(product.ID, "Client source"))
		t.Require().Equal(http.StatusCreated, status)

		result := createTestClientResult(t, client, component.ID, httpclients.CreateRequestV1{
			ClientName: "unknown-client",
		})
		t.Require().Equal(http.StatusBadRequest, result.Status)
		t.Assert().Equal(errmap.CodeInvalidClientType, result.Failure.Code)
	}, allureArtifactsDir))
}

func TestDuplicateComponentClientE2E(t *testing.T) {
	client := environment.server.Client()

	t.Run("RejectDuplicateClientForComponent", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Client")
		t.Story("Create client")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject creating the same client type twice for one component")

		resetDatabase(t)
		product := createTestProductForComponent(t, client)
		component, status := createTestComponent(t, client, testBackendComponentRequest(product.ID, "Client source"))
		t.Require().Equal(http.StatusCreated, status)

		request := httpclients.CreateRequestV1{ClientName: inventory.RESTClient}
		created := createTestClientResult(t, client, component.ID, request)
		t.Require().Equal(http.StatusCreated, created.Status)

		duplicate := createTestClientResult(t, client, component.ID, request)
		t.Require().Equal(http.StatusConflict, duplicate.Status)
		t.Assert().Equal(errmap.CodeClientAlreadyExists, duplicate.Failure.Code)
	}, allureArtifactsDir))
}

type clientCreationResult struct {
	Client  httpclients.ResponseV1
	Failure errmap.Error
	Status  int
}

func testRESTClientRequest() httpclients.CreateRequestV1 {
	return httpclients.CreateRequestV1{
		ClientName: inventory.RESTClient,
	}
}

func createTestClientResult(
	t T,
	client *http.Client,
	componentID int64,
	testRequest httpclients.CreateRequestV1,
) clientCreationResult {
	t.Helper()
	route := environment.server.URL + "/v1/components/" + strconv.FormatInt(componentID, 10) + "/clients"
	requestBody, attachment := marshalRequestBody(t, testRequest)
	request, err := http.NewRequestWithContext(t.Context(), http.MethodPost, route, requestBody)
	t.Require().NoError(err)
	request.Header.Set("Content-Type", "application/json")
	t.Attach("Send client creation request", allureJSONAttachment(t, attachment))

	response, err := client.Do(request)
	t.Require().NoError(err)
	defer response.Body.Close()

	result := clientCreationResult{Status: response.StatusCode}
	if response.StatusCode == http.StatusCreated {
		result.Client, _ = unmarshalResponseBody[httpclients.ResponseV1](t, response)
		return result
	}
	result.Failure, _ = unmarshalResponseBody[errmap.Error](t, response)
	return result
}
