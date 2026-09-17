package e2e_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"testing"

	"github.com/76parker/alpa/internal/domain/inventory"
	httpapis "github.com/76parker/alpa/internal/httpapi/apis"
	httpclients "github.com/76parker/alpa/internal/httpapi/clients"
	"github.com/76parker/alpa/internal/httpapi/component"
	"github.com/76parker/alpa/internal/httpapi/errmap"
	"github.com/76parker/alpa/internal/httpapi/product"
	"github.com/76parker/alpa/pkg/httputil"
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

			t.Assert().Empty(createdComponent.APIs, "component creation does not create APIs")
			t.Assert().Empty(createdComponent.Clients, "component creation does not create clients")
		})
	}, allureArtifactsDir))

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
	}, allureArtifactsDir))

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
	}, allureArtifactsDir))

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
	}, allureArtifactsDir))

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
	}, allureArtifactsDir))

	// Infrastructure details must survive HTTP normalization and JSONB storage without losing addresses.
	t.Run("InfrastructureSystemTypesAndAddresses", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Create infrastructure component")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e")
		t.Title("Validate system types and round-trip infrastructure addresses")
		resetDatabase(t)
		createdProduct := createTestProductForComponent(t, client)

		addresses := []string{
			" Primary.internal:5432 ", "replica.internal:5432", "replica.internal:5432",
			"host4:5432", "host5:5432", "host6:5432", "host7:5432", "host8:5432", "host9:5432", "host10:5432",
		}
		encodedAddresses, err := json.Marshal(addresses)
		t.Require().NoError(err)
		tooMany, err := json.Marshal(append(append([]string{}, addresses...), "host11:5432"))
		t.Require().NoError(err)
		expectedAddresses := append([]string{}, addresses...)
		expectedAddresses[0] = "Primary.internal:5432"
		cases := []struct {
			name           string
			systemType     string
			addressJSON    string
			wantSystemType string
			wantAddresses  []string
			wantCode       errmap.Code
		}{
			{name: "queue with ten addresses", systemType: `" queue/stream "`, addressJSON: string(encodedAddresses), wantSystemType: "queue/stream", wantAddresses: expectedAddresses},
			{name: "sql with null addresses", systemType: `"sql-database"`, addressJSON: "null", wantSystemType: "sql-database", wantAddresses: []string{}},
			{name: "nosql without addresses", systemType: `"nosql-database"`, wantSystemType: "nosql-database", wantAddresses: []string{}},
			{name: "workflow with empty addresses", systemType: `"workflow-engine"`, addressJSON: "[]", wantSystemType: "workflow-engine", wantAddresses: []string{}},
			{name: "unknown system type", systemType: `"SQL-DATABASE"`, wantCode: "unknown_system_type"},
			{name: "empty system type", systemType: `"  "`, wantCode: "unknown_system_type"},
			{name: "missing system type", wantCode: "unknown_system_type"},
			{name: "eleven addresses", systemType: `"sql-database"`, addressJSON: string(tooMany), wantCode: "too_many_network_addresses"},
			{name: "legacy address string", systemType: `"sql-database"`, addressJSON: `"host:5432"`, wantCode: "invalid_request"},
		}
		persisted := 0
		for _, tc := range cases {
			allure.Step(t, tc.name, func(t T) {
				detailsJSON := `{"system":" PostgreSQL ","version":" 17 "`
				if tc.systemType != "" {
					detailsJSON += `,"system_type":` + tc.systemType
				}
				if tc.addressJSON != "" {
					detailsJSON += `,"network_address":` + tc.addressJSON
				}
				detailsJSON += "}"
				input := component.CreateRequestV1{
					ProductID: createdProduct.ID,
					Name:      " " + tc.name + " ",
					Type:      "infrastructure",
					Details:   json.RawMessage(detailsJSON),
				}
				body, _ := marshalRequestBody(t, input)
				request, err := http.NewRequestWithContext(t.Context(), http.MethodPost, environment.server.URL+"/v1/components", body)
				t.Require().NoError(err)
				request.Header.Set("Content-Type", "application/json")
				response, err := client.Do(request)
				t.Require().NoError(err)
				defer response.Body.Close()
				if tc.wantCode != "" {
					t.Require().Equal(http.StatusBadRequest, response.StatusCode)
					failure, _ := unmarshalResponseBody[errmap.Error](t, response)
					t.Assert().Equal(tc.wantCode, failure.Code)
				} else {
					t.Require().Equal(http.StatusCreated, response.StatusCode)
					created, _ := unmarshalResponseBody[component.ResponseV1](t, response)
					t.Assert().Equal(tc.name, created.Name)
					t.Assert().Equal("infrastructure", created.Type)
					returned, status := getTestComponent(t, client, created.ID)
					t.Require().Equal(http.StatusOK, status)
					t.Assert().Equal(created, returned)
					var storedJSON []byte
					err = environment.postgres.pool.QueryRow(t.Context(), "SELECT details FROM inventory.components WHERE id = $1", created.ID).Scan(&storedJSON)
					t.Require().NoError(err)
					var stored struct {
						SchemaVersion  int      `json:"schema_version"`
						System         string   `json:"system"`
						SystemType     string   `json:"system_type"`
						Version        string   `json:"version"`
						NetworkAddress []string `json:"network_address"`
					}
					t.Require().NoError(json.Unmarshal(storedJSON, &stored))
					t.Assert().Equal(1, stored.SchemaVersion)
					t.Assert().Equal("PostgreSQL", stored.System)
					t.Assert().Equal("17", stored.Version)
					t.Assert().Equal(tc.wantSystemType, stored.SystemType)
					t.Assert().Equal(tc.wantAddresses, stored.NetworkAddress)
					wantDetails, err := json.Marshal(map[string]any{
						"system": "PostgreSQL", "system_type": tc.wantSystemType, "version": "17", "network_address": tc.wantAddresses,
					})
					t.Require().NoError(err)
					gotDetails, err := json.Marshal(returned.Details)
					t.Require().NoError(err)
					t.Assert().JSONEq(string(wantDetails), string(gotDetails))
					persisted++
				}
				var count int
				err = environment.postgres.pool.QueryRow(t.Context(), "SELECT count(*) FROM inventory.components").Scan(&count)
				t.Require().NoError(err)
				t.Assert().Equal(persisted, count, "rejected requests must not persist components")
			})
		}
	}, allureArtifactsDir))

	t.Run("CreateAPIsAndClientsThenReadComponent", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Create component APIs and clients")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Create APIs and clients independently and return stable read projections")
		resetDatabase(t)

		createdProduct := createTestProductForComponent(t, client)
		createdComponent, statusCode := createTestComponent(t, client, testBackendComponentRequest(createdProduct.ID, "Orders"))
		t.Require().Equal(http.StatusCreated, statusCode)

		firstAPI, statusCode := createTestAPI(t, client, createdComponent.ID, httpapis.CreateRequestV1{
			Name:            "Orders REST",
			APIType:         inventory.APITypeREST,
			NetworkExposure: inventory.NetworkExposureInternal,
		})
		t.Require().Equal(http.StatusCreated, statusCode)
		secondAPI, statusCode := createTestAPI(t, client, createdComponent.ID, httpapis.CreateRequestV1{
			Name:            "Orders events",
			APIType:         inventory.APITypeEventConsumer,
			NetworkExposure: inventory.NetworkExposureInternal,
		})
		t.Require().Equal(http.StatusCreated, statusCode)
		firstClient, statusCode := createTestClient(t, client, createdComponent.ID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, statusCode)
		description := "publishes events"
		secondClient, statusCode := createTestClient(t, client, createdComponent.ID, httpclients.CreateRequestV1{
			ClientName:        inventory.KafkaClient,
			Role:              inventory.EventProducerRole,
			CommunicationType: inventory.Events,
			Description:       &description,
		})
		t.Require().Equal(http.StatusCreated, statusCode)

		returned, statusCode := getTestComponent(t, client, createdComponent.ID)
		t.Require().Equal(http.StatusOK, statusCode)
		t.Require().Len(returned.APIs, 2)
		t.Require().Len(returned.Clients, 2)
		t.Assert().Equal([]int64{firstAPI.ID, secondAPI.ID}, []int64{returned.APIs[0].ID, returned.APIs[1].ID})
		t.Assert().Equal([]int64{firstClient.ID, secondClient.ID}, []int64{returned.Clients[0].ID, returned.Clients[1].ID})
		t.Assert().Empty(returned.Clients[0].Description, "omitted description is represented as an empty string")

		// A second aggregate catches accidental cross-component grouping in the list projection.
		secondComponent, statusCode := createTestComponent(t, client, testBackendComponentRequest(createdProduct.ID, "Billing"))
		t.Require().Equal(http.StatusCreated, statusCode)
		billingAPI, statusCode := createTestAPI(t, client, secondComponent.ID, httpapis.CreateRequestV1{
			Name:            "Billing REST",
			APIType:         inventory.APITypeREST,
			NetworkExposure: inventory.NetworkExposureInternal,
		})
		t.Require().Equal(http.StatusCreated, statusCode)

		listed, statusCode := listTestComponents(t, client, createdProduct.ID)
		t.Require().Equal(http.StatusOK, statusCode)
		t.Require().Len(listed.Data, 2)
		t.Assert().Equal(returned, listed.Data[0], "list and get use the same aggregate projection")
		t.Require().Len(listed.Data[1].APIs, 1)
		t.Assert().Equal(billingAPI.ID, listed.Data[1].APIs[0].ID)
		t.Assert().Empty(listed.Data[1].Clients, "children from another component must not leak into the aggregate")
	}, allureArtifactsDir))

	t.Run("RejectChildrenForUnknownComponent", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Component")
		t.Story("Create component APIs and clients")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Return not found when the owning component does not exist")
		resetDatabase(t)

		_, apiStatus := createTestAPI(t, client, 999, httpapis.CreateRequestV1{
			Name:            "Unknown",
			APIType:         inventory.APITypeREST,
			NetworkExposure: inventory.NetworkExposureInternal,
		})
		_, clientStatus := createTestClient(t, client, 999, testRESTClientRequest())
		t.Assert().Equal(http.StatusNotFound, apiStatus)
		t.Assert().Equal(http.StatusNotFound, clientStatus)
	}, allureArtifactsDir))

	// Aggregate creation must be atomic and expose the persisted child IDs immediately.
	t.Run("CreateComponentWithAPIsAndClients", testo.Test(func(t T) {
		resetDatabase(t)
		createdProduct := createTestProductForComponent(t, client)
		request := testBackendComponentRequest(createdProduct.ID, "Checkout")
		request.APIs = []component.CreateAPIRequestV1{
			{Name: "Checkout REST", APIType: inventory.APITypeREST, NetworkExposure: inventory.NetworkExposureInternet},
			{Name: "Checkout events", APIType: inventory.APITypeEventConsumer, NetworkExposure: inventory.NetworkExposureInternal},
		}
		request.Clients = []component.CreateClientRequestV1{
			{ClientName: inventory.RESTClient, Role: inventory.CallerRole, CommunicationType: inventory.RequestResponse},
			{ClientName: inventory.KafkaClient, Role: inventory.EventProducerRole, CommunicationType: inventory.Events, Description: testStringPointer("publishes events")},
		}

		created, status := createTestComponent(t, client, request)
		t.Require().Equal(http.StatusCreated, status)
		t.Require().Len(created.APIs, 2)
		t.Require().Len(created.Clients, 2)
		for _, api := range created.APIs {
			t.Assert().Greater(api.ID, int64(0))
		}
		for _, componentClient := range created.Clients {
			t.Assert().Greater(componentClient.ID, int64(0))
			t.Assert().Nil(componentClient.APIID)
		}
		t.Assert().Equal([]string{"Checkout REST", "Checkout events"}, []string{created.APIs[0].Name, created.APIs[1].Name})

		loaded, status := getTestComponent(t, client, created.ID)
		t.Require().Equal(http.StatusOK, status)
		t.Assert().Equal(created, loaded)
		listed, status := listTestComponents(t, client, createdProduct.ID)
		t.Require().Equal(http.StatusOK, status)
		t.Require().Len(listed.Data, 1)
		t.Assert().Equal(created, listed.Data[0])

		var apiCount, clientCount int
		err := environment.postgres.pool.QueryRow(t.Context(), "SELECT count(*) FROM inventory.apis WHERE component_id = $1", created.ID).Scan(&apiCount)
		t.Require().NoError(err)
		err = environment.postgres.pool.QueryRow(t.Context(), "SELECT count(*) FROM inventory.component_clients WHERE component_id = $1", created.ID).Scan(&clientCount)
		t.Require().NoError(err)
		t.Assert().Equal(2, apiCount)
		t.Assert().Equal(2, clientCount)
	}, allureArtifactsDir))

	// The request-size guard must reject an entire aggregate before its component is written.
	t.Run("RejectComponentWithMoreThanFiveChildren", testo.Test(func(t T) {
		resetDatabase(t)
		createdProduct := createTestProductForComponent(t, client)
		request := testBackendComponentRequest(createdProduct.ID, "Too many APIs")
		request.APIs = make([]component.CreateAPIRequestV1, 6)
		for i := range request.APIs {
			request.APIs[i] = component.CreateAPIRequestV1{Name: "API " + strconv.Itoa(i), APIType: inventory.APITypeREST, NetworkExposure: inventory.NetworkExposureInternal}
		}
		_, status := createTestComponent(t, client, request)
		t.Require().Equal(http.StatusBadRequest, status)
		var componentCount int
		err := environment.postgres.pool.QueryRow(t.Context(), "SELECT count(*) FROM inventory.components").Scan(&componentCount)
		t.Require().NoError(err)
		t.Assert().Zero(componentCount)
	}, allureArtifactsDir))

	// Locking the parent component serializes the count-and-insert sequence for concurrent API requests.
	t.Run("LimitConcurrentAPICreationToFive", testo.Test(func(t T) {
		resetDatabase(t)
		createdProduct := createTestProductForComponent(t, client)
		createdComponent, status := createTestComponent(t, client, testBackendComponentRequest(createdProduct.ID, "Concurrent APIs"))
		t.Require().Equal(http.StatusCreated, status)

		statuses := make(chan int, 8)
		errs := make(chan error, 8)
		var group sync.WaitGroup
		for i := 0; i < cap(statuses); i++ {
			group.Add(1)
			go func(index int) {
				defer group.Done()
				status, err := createAPIStatus(t.Context(), client, createdComponent.ID, httpapis.CreateRequestV1{
					Name:            "Concurrent API " + strconv.Itoa(index),
					APIType:         inventory.APITypeREST,
					NetworkExposure: inventory.NetworkExposureInternal,
				})
				errs <- err
				statuses <- status
			}(i)
		}
		group.Wait()
		close(statuses)
		close(errs)
		for err := range errs {
			t.Require().NoError(err)
		}
		createdCount := 0
		for status := range statuses {
			if status == http.StatusCreated {
				createdCount++
			}
		}
		t.Assert().Equal(5, createdCount)
		var storedCount int
		err := environment.postgres.pool.QueryRow(t.Context(), "SELECT count(*) FROM inventory.apis WHERE component_id = $1", createdComponent.ID).Scan(&storedCount)
		t.Require().NoError(err)
		t.Assert().Equal(5, storedCount)
	}, allureArtifactsDir))

	// Clients use the same parent-row lock so parallel writes cannot exceed their separate limit.
	t.Run("LimitConcurrentClientCreationToFive", testo.Test(func(t T) {
		resetDatabase(t)
		createdProduct := createTestProductForComponent(t, client)
		createdComponent, status := createTestComponent(t, client, testBackendComponentRequest(createdProduct.ID, "Concurrent clients"))
		t.Require().Equal(http.StatusCreated, status)

		statuses := make(chan int, 8)
		errs := make(chan error, 8)
		var group sync.WaitGroup
		for i := 0; i < cap(statuses); i++ {
			group.Add(1)
			go func() {
				defer group.Done()
				status, err := createClientStatus(t.Context(), client, createdComponent.ID, testRESTClientRequest())
				errs <- err
				statuses <- status
			}()
		}
		group.Wait()
		close(statuses)
		close(errs)
		for err := range errs {
			t.Require().NoError(err)
		}
		createdCount := 0
		for status := range statuses {
			if status == http.StatusCreated {
				createdCount++
			}
		}
		t.Assert().Equal(5, createdCount)
		var storedCount int
		err := environment.postgres.pool.QueryRow(t.Context(), "SELECT count(*) FROM inventory.component_clients WHERE component_id = $1", createdComponent.ID).Scan(&storedCount)
		t.Require().NoError(err)
		t.Assert().Equal(5, storedCount)
	}, allureArtifactsDir))

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
		_, statusCode = createTestAPI(t, client, createdComponent.ID, httpapis.CreateRequestV1{
			Name:            "Orders",
			APIType:         inventory.APITypeREST,
			NetworkExposure: inventory.NetworkExposureInternal,
		})
		t.Require().Equal(http.StatusCreated, statusCode)
		_, statusCode = createTestClient(t, client, createdComponent.ID, testRESTClientRequest())
		t.Require().Equal(http.StatusCreated, statusCode)

		statusCode = deleteTestComponent(t, client, createdComponent.ID)
		allure.Step(t, "verify component deletion", func(t T) {
			t.Require().Equal(http.StatusNoContent, statusCode, "component deletion returns 204 No Content")
			var apiCount, clientCount int
			err := environment.postgres.pool.QueryRow(t.Context(), "SELECT count(*) FROM inventory.apis").Scan(&apiCount)
			t.Require().NoError(err)
			err = environment.postgres.pool.QueryRow(t.Context(), "SELECT count(*) FROM inventory.component_clients").Scan(&clientCount)
			t.Require().NoError(err)
			t.Assert().Zero(apiCount, "component deletion cascades to APIs")
			t.Assert().Zero(clientCount, "component deletion cascades to clients")
		})
	}, allureArtifactsDir))

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
	}, allureArtifactsDir))
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
	}
}

func testStringPointer(value string) *string {
	return &value
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

func createTestAPI(
	t T,
	client *http.Client,
	componentID int64,
	testRequest httpapis.CreateRequestV1,
) (httpapis.ResponseV1, int) {
	t.Helper()
	route := environment.server.URL + "/v1/components/" + strconv.FormatInt(componentID, 10) + "/apis"
	requestBody, attachment := marshalRequestBody(t, testRequest)
	request, err := http.NewRequestWithContext(t.Context(), http.MethodPost, route, requestBody)
	t.Require().NoError(err)
	request.Header.Set("Content-Type", "application/json")
	t.Attach("Send API creation request", allureJSONAttachment(t, attachment))

	response, err := client.Do(request)
	t.Require().NoError(err)
	defer response.Body.Close()
	created, _ := unmarshalResponseBody[httpapis.ResponseV1](t, response)
	return created, response.StatusCode
}

func createAPIStatus(
	ctx context.Context,
	client *http.Client,
	componentID int64,
	requestBody httpapis.CreateRequestV1,
) (int, error) {
	body, err := json.Marshal(requestBody)
	if err != nil {
		return 0, err
	}
	route := environment.server.URL + "/v1/components/" + strconv.FormatInt(componentID, 10) + "/apis"
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
	return response.StatusCode, nil
}

func createTestClient(
	t T,
	client *http.Client,
	componentID int64,
	testRequest httpclients.CreateRequestV1,
) (httpclients.ResponseV1, int) {
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
	created, _ := unmarshalResponseBody[httpclients.ResponseV1](t, response)
	return created, response.StatusCode
}

func createClientStatus(
	ctx context.Context,
	client *http.Client,
	componentID int64,
	requestBody httpclients.CreateRequestV1,
) (int, error) {
	body, err := json.Marshal(requestBody)
	if err != nil {
		return 0, err
	}
	route := environment.server.URL + "/v1/components/" + strconv.FormatInt(componentID, 10) + "/clients"
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
	return response.StatusCode, nil
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

func listTestComponents(
	t T,
	client *http.Client,
	productID int64,
) (httputil.ListResponse[component.ResponseV1], int) {
	t.Helper()
	route := environment.server.URL + "/v1/products/" + strconv.FormatInt(productID, 10) + "/components"
	request, err := http.NewRequestWithContext(t.Context(), http.MethodGet, route, nil)
	t.Require().NoError(err)
	response, err := client.Do(request)
	t.Require().NoError(err)
	defer response.Body.Close()
	listed, _ := unmarshalResponseBody[httputil.ListResponse[component.ResponseV1]](t, response)
	return listed, response.StatusCode
}
