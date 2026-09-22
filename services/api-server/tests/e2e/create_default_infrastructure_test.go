package e2e_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/ozontech/testo"
	allure "github.com/ozontech/testo-allure"

	"github.com/76parker/alpa/internal/httpapi/component"
	"github.com/76parker/alpa/internal/httpapi/errmap"
)

type infrastructureCreationExpectation struct {
	title          string
	componentName  string
	details        json.RawMessage
	technologyName string
	technologyType string
	endpoints      []string
}

type infrastructureRejectionExpectation struct {
	title         string
	componentName string
	details       json.RawMessage
	wantCode      errmap.Code
}

type infrastructureDetailsProjection struct {
	TechnologyName string   `json:"technology_name"`
	TechnologyType string   `json:"technology_type"`
	Importancy     string   `json:"importancy"`
	Version        string   `json:"version"`
	Endpoints      []string `json:"endpoints"`
}

type storedInfrastructureDetails struct {
	SchemaVersion  int      `json:"schema_version"`
	TechnologyName string   `json:"technology_name"`
	TechnologyType string   `json:"technology_type"`
	Importancy     string   `json:"importancy"`
	Version        string   `json:"version"`
	Endpoints      []string `json:"endpoints"`
}

func TestCreateDefaultInfrastructureE2E(t *testing.T) {
	client := environment.server.Client()
	expectedAddresses := []string{
		"Primary.internal:5432", "replica.internal:5432", "replica.internal:5432",
		"host4:5432", "host5:5432", "host6:5432", "host7:5432", "host8:5432", "host9:5432", "host10:5432",
	}

	t.Run("Create Kafka infrastructure with ten endpoints", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create Kafka infrastructure with ten endpoints and preserve normalized endpoint order",
		componentName:  "Kafka with ten endpoints",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":" kafka ","technology_type":" message-broker ","endpoints":[" Primary.internal:5432 ","replica.internal:5432","replica.internal:5432","host4:5432","host5:5432","host6:5432","host7:5432","host8:5432","host9:5432","host10:5432"]}`),
		technologyName: "kafka",
		technologyType: "message-broker",
		endpoints:      expectedAddresses,
	}))
	t.Run("Create PostgreSQL infrastructure with null endpoints", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create PostgreSQL infrastructure and normalize null endpoints",
		componentName:  "PostgreSQL",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":" postgresql ","technology_type":" sql-database ","endpoints":null}`),
		technologyName: "postgresql",
		technologyType: "sql-database",
		endpoints:      []string{},
	}))
	t.Run("Create MongoDB infrastructure without endpoints", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create MongoDB infrastructure without an endpoints field",
		componentName:  "MongoDB",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"mongodb","technology_type":"nosql-database"}`),
		technologyName: "mongodb",
		technologyType: "nosql-database",
		endpoints:      []string{},
	}))
	t.Run("Create Redis infrastructure with empty endpoints", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create Redis infrastructure and preserve an empty endpoints array",
		componentName:  "Redis",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"redis","technology_type":"cache","endpoints":[]}`),
		technologyName: "redis",
		technologyType: "cache",
		endpoints:      []string{},
	}))
	t.Run("Create Elasticsearch infrastructure", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create Elasticsearch infrastructure with its default search engine type",
		componentName:  "Elasticsearch",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"elasticsearch","technology_type":"search-engine"}`),
		technologyName: "elasticsearch",
		technologyType: "search-engine",
		endpoints:      []string{},
	}))
	t.Run("Create S3 infrastructure", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create S3 infrastructure with its default object storage type",
		componentName:  "S3",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"s3","technology_type":"object-storage"}`),
		technologyName: "s3",
		technologyType: "object-storage",
		endpoints:      []string{},
	}))
	t.Run("Create Temporal infrastructure", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create Temporal infrastructure with its default workflow engine type",
		componentName:  "Temporal",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"temporal","technology_type":"workflow-engine"}`),
		technologyName: "temporal",
		technologyType: "workflow-engine",
		endpoints:      []string{},
	}))
	t.Run("Create Envoy proxy/load balancer infrastructure", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create Envoy infrastructure with its default proxy/load balancer type",
		componentName:  "Envoy",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"envoy","technology_type":"proxy/load-balancer"}`),
		technologyName: "envoy",
		technologyType: "proxy/load-balancer",
		endpoints:      []string{},
	}))
	t.Run("Create Kong API gateway infrastructure", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create Kong infrastructure with its default API gateway type",
		componentName:  "Kong",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"kong","technology_type":"api-gateway"}`),
		technologyName: "kong",
		technologyType: "api-gateway",
		endpoints:      []string{},
	}))
	t.Run("Create HAProxy proxy/load balancer infrastructure", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create HAProxy infrastructure with its default proxy/load balancer type",
		componentName:  "HAProxy",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"haproxy","technology_type":"proxy/load-balancer"}`),
		technologyName: "haproxy",
		technologyType: "proxy/load-balancer",
		endpoints:      []string{},
	}))
	t.Run("Create Keycloak identity provider infrastructure", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create Keycloak infrastructure with its default identity provider type",
		componentName:  "Keycloak",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"keycloak","technology_type":"identity-provider"}`),
		technologyName: "keycloak",
		technologyType: "identity-provider",
		endpoints:      []string{},
	}))
	t.Run("Create Vault secret storage infrastructure", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create Vault infrastructure with its default secret storage type",
		componentName:  "Vault",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"vault","technology_type":"secret-storage"}`),
		technologyName: "vault",
		technologyType: "secret-storage",
		endpoints:      []string{},
	}))
	t.Run("Create Prometheus monitoring infrastructure", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create Prometheus infrastructure with its default monitoring type",
		componentName:  "Prometheus",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"prometheus","technology_type":"monitoring"}`),
		technologyName: "prometheus",
		technologyType: "monitoring",
		endpoints:      []string{},
	}))
	t.Run("Create Grafana monitoring infrastructure", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create Grafana infrastructure with its default monitoring type",
		componentName:  "Grafana",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"grafana","technology_type":"monitoring"}`),
		technologyName: "grafana",
		technologyType: "monitoring",
		endpoints:      []string{},
	}))
	t.Run("Create Jaeger tracing infrastructure", createInfrastructureE2ETest(client, infrastructureCreationExpectation{
		title:          "Create Jaeger infrastructure with its default tracing type",
		componentName:  "Jaeger",
		details:        json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"jaeger","technology_type":"tracing"}`),
		technologyName: "jaeger",
		technologyType: "tracing",
		endpoints:      []string{},
	}))

	t.Run("Reject PostgreSQL creation with an unsupported technology alias", rejectInfrastructureCreationE2ETest(client, infrastructureRejectionExpectation{
		title:         "Reject PostgreSQL creation when the technology alias is unsupported",
		componentName: "Unsupported PostgreSQL alias",
		details:       json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"postgres","technology_type":"sql-database"}`),
		wantCode:      "unknown_technology_name",
	}))
	t.Run("Reject PostgreSQL creation without technology name", rejectInfrastructureCreationE2ETest(client, infrastructureRejectionExpectation{
		title:         "Reject PostgreSQL infrastructure without a technology name",
		componentName: "PostgreSQL without technology name",
		details:       json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_type":"sql-database"}`),
		wantCode:      "unknown_technology_name",
	}))
	t.Run("Reject PostgreSQL creation with unknown technology type", rejectInfrastructureCreationE2ETest(client, infrastructureRejectionExpectation{
		title:         "Reject PostgreSQL infrastructure with an unknown technology type",
		componentName: "PostgreSQL with unknown technology type",
		details:       json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"postgresql","technology_type":"SQL-DATABASE"}`),
		wantCode:      "unknown_technology_type",
	}))
	t.Run("Reject PostgreSQL creation with empty technology type", rejectInfrastructureCreationE2ETest(client, infrastructureRejectionExpectation{
		title:         "Reject PostgreSQL infrastructure with an empty technology type",
		componentName: "PostgreSQL with empty technology type",
		details:       json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"postgresql","technology_type":"  "}`),
		wantCode:      "unknown_technology_type",
	}))
	t.Run("Reject PostgreSQL creation without technology type", rejectInfrastructureCreationE2ETest(client, infrastructureRejectionExpectation{
		title:         "Reject PostgreSQL infrastructure without a technology type",
		componentName: "PostgreSQL without technology type",
		details:       json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"postgresql"}`),
		wantCode:      "unknown_technology_type",
	}))
	t.Run("Reject PostgreSQL creation without importancy", rejectInfrastructureCreationE2ETest(client, infrastructureRejectionExpectation{
		title:         "Reject PostgreSQL infrastructure without importancy",
		componentName: "PostgreSQL without importancy",
		details:       json.RawMessage(`{"version":" 17 ","technology_name":"postgresql","technology_type":"sql-database"}`),
		wantCode:      "invalid_request",
	}))
	t.Run("Reject PostgreSQL creation with unknown importancy", rejectInfrastructureCreationE2ETest(client, infrastructureRejectionExpectation{
		title:         "Reject PostgreSQL infrastructure with an unknown importancy",
		componentName: "PostgreSQL with unknown importancy",
		details:       json.RawMessage(`{"version":" 17 ","importancy":"mission-critical","technology_name":"postgresql","technology_type":"sql-database"}`),
		wantCode:      "invalid_importancy",
	}))
	t.Run("Reject PostgreSQL creation with eleven endpoints", rejectInfrastructureCreationE2ETest(client, infrastructureRejectionExpectation{
		title:         "Reject PostgreSQL infrastructure with more than ten endpoints",
		componentName: "PostgreSQL with eleven endpoints",
		details:       json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"postgresql","technology_type":"sql-database","endpoints":["host1","host2","host3","host4","host5","host6","host7","host8","host9","host10","host11"]}`),
		wantCode:      "too_many_endpoints",
	}))
	t.Run("Reject PostgreSQL creation with endpoints encoded as a string", rejectInfrastructureCreationE2ETest(client, infrastructureRejectionExpectation{
		title:         "Reject PostgreSQL infrastructure when endpoints are not an array",
		componentName: "PostgreSQL with invalid endpoints",
		details:       json.RawMessage(`{"version":" 17 ","importancy":"critical","technology_name":"postgresql","technology_type":"sql-database","endpoints":"host:5432"}`),
		wantCode:      "invalid_request",
	}))
}

func createInfrastructureE2ETest(client *http.Client, expectation infrastructureCreationExpectation) func(*testing.T) {
	return infrastructureE2ETest(client, expectation.title, "positive", func(t T, productID int64) {
		assertInfrastructureCreated(t, client, productID, expectation)
	})
}

func rejectInfrastructureCreationE2ETest(client *http.Client, expectation infrastructureRejectionExpectation) func(*testing.T) {
	return infrastructureE2ETest(client, expectation.title, "negative", func(t T, productID int64) {
		assertInfrastructureRejected(t, client, productID, expectation)
	})
}

func infrastructureE2ETest(
	client *http.Client,
	title string,
	tag string,
	verify func(T, int64),
) func(*testing.T) {
	return testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Infrastructure")
		t.Story("Create infrastructure component")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", tag)
		t.Title(title)
		resetDatabase(t)

		createdProduct := createTestProductForComponent(t, client)
		verify(t, createdProduct.ID)
	}, allureArtifactsDir)
}

func assertInfrastructureCreated(
	t T,
	client *http.Client,
	productID int64,
	expectation infrastructureCreationExpectation,
) {
	created, statusCode := createTestComponent(t, client, component.CreateRequestV1{
		ProductID: productID,
		Name:      expectation.componentName,
		Type:      "infrastructure",
		Details:   expectation.details,
	})
	t.Require().Equal(http.StatusCreated, statusCode)
	t.Assert().Equal(expectation.componentName, created.Name)
	t.Assert().Equal("infrastructure", created.Type)

	loaded, statusCode := getTestComponent(t, client, created.ID)
	t.Require().Equal(http.StatusOK, statusCode)
	t.Assert().Equal(created, loaded)

	var storedJSON []byte
	err := environment.postgres.pool.QueryRow(t.Context(), "SELECT details FROM inventory.components WHERE id = $1", created.ID).Scan(&storedJSON)
	t.Require().NoError(err)
	var stored storedInfrastructureDetails
	t.Require().NoError(json.Unmarshal(storedJSON, &stored))
	t.Assert().Equal(1, stored.SchemaVersion)
	t.Assert().Equal(expectation.technologyName, stored.TechnologyName)
	t.Assert().Equal(expectation.technologyType, stored.TechnologyType)
	t.Assert().Equal("critical", stored.Importancy)
	t.Assert().Equal("17", stored.Version)
	t.Assert().Equal(expectation.endpoints, stored.Endpoints)

	wantDetails, err := json.Marshal(infrastructureDetailsProjection{
		TechnologyName: expectation.technologyName,
		TechnologyType: expectation.technologyType,
		Importancy:     "critical",
		Version:        "17",
		Endpoints:      expectation.endpoints,
	})
	t.Require().NoError(err)
	gotDetails, err := json.Marshal(loaded.Details)
	t.Require().NoError(err)
	t.Assert().JSONEq(string(wantDetails), string(gotDetails))

	var componentCount int
	err = environment.postgres.pool.QueryRow(t.Context(), "SELECT count(*) FROM inventory.components").Scan(&componentCount)
	t.Require().NoError(err)
	t.Assert().Equal(1, componentCount)
}

func assertInfrastructureRejected(
	t T,
	client *http.Client,
	productID int64,
	expectation infrastructureRejectionExpectation,
) {
	requestBody, _ := marshalRequestBody(t, component.CreateRequestV1{
		ProductID: productID,
		Name:      expectation.componentName,
		Type:      "infrastructure",
		Details:   expectation.details,
	})
	request, err := http.NewRequestWithContext(t.Context(), http.MethodPost, environment.server.URL+"/v1/components", requestBody)
	t.Require().NoError(err)
	request.Header.Set("Content-Type", "application/json")
	response, err := client.Do(request)
	t.Require().NoError(err)
	defer response.Body.Close()
	t.Require().Equal(http.StatusBadRequest, response.StatusCode)

	failure, _ := unmarshalResponseBody[errmap.Error](t, response)
	t.Assert().Equal(expectation.wantCode, failure.Code)

	var componentCount int
	err = environment.postgres.pool.QueryRow(t.Context(), "SELECT count(*) FROM inventory.components").Scan(&componentCount)
	t.Require().NoError(err)
	t.Assert().Equal(0, componentCount, "rejected requests must not persist components")
}
