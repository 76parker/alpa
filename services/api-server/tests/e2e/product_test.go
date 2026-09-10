package e2e_test

import (
	"fmt"
	"net/http"
	"strconv"
	"testing"

	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/76parker/alpa/internal/httpapi/product"
	"github.com/ozontech/testo"
	allure "github.com/ozontech/testo-allure"
)

func TestProductE2E(t *testing.T) {
	client := environment.server.Client()

	t.Run("CreateProductInWorkspace", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Product")
		t.Story("Create product")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Create product with correct request")
		workspace, statusCode := createTestWorkspace(t, environment.server.URL, client, "Test Workspace")
		allure.Step(t, "verify prerequisite workspace", func(t T) {
			t.Assert().Equal(http.StatusCreated, statusCode, "workspace creation returns 201 Created")
			t.Assert().Equal("Test Workspace", workspace.Name, "created workspace has the requested name")
			t.Assert().Greater(workspace.ID, int64(0), "created workspace receives a positive ID")
		})

		testRequest := product.CreateRequestV1{
			Name:         "Test Product",
			Criticality:  inventory.CriticalityMissionCritical,
			OwningTeamID: nil,
			Description:  nil,
			ProductCode:  "TP",
		}
		product, statusCode := createTestProduct(t, client, workspace.ID, testRequest)
		allure.Step(t, "verify created product", func(t T) {
			t.Require().Equal(http.StatusCreated, statusCode, "product creation returns 201 Created")
			t.Assert().Greater(product.ID, int64(0), "created product receives a positive ID")
			t.Assert().Equal("Test Product", product.Name, "created product has the requested name")
			t.Assert().Equal("TP", product.ProductCode, "created product has the requested code")
			t.Assert().Equal(string(inventory.CriticalityMissionCritical), string(product.Criticality), "created product has the requested criticality")
			t.Assert().Nil(product.Description, "created product has no description")
			t.Assert().Nil(product.OwningTeamID, "created product has no owning team")
		})

	}, allure.WithOutputDir("../../test-results/allure")))
	t.Run("CreateProductWithInvalidCriticality", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Product")
		t.Story("Create product")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject product with invalid criticality")
		resetDatabase(t)
		workspace, statusCode := createTestWorkspace(t, environment.server.URL, client, "Test Workspace")
		allure.Step(t, "verify prerequisite workspace", func(t T) {
			t.Require().Equal(http.StatusCreated, statusCode, "workspace creation returns 201 Created")
		})
		testRequest := product.CreateRequestV1{
			Name:         "Test Product",
			Criticality:  "INVALID",
			OwningTeamID: nil,
			Description:  nil,
			ProductCode:  "TP",
		}
		_, statusCode = createTestProduct(t, client, workspace.ID, testRequest)
		allure.Step(t, "verify rejection for invalid criticality", func(t T) {
			t.Require().Equal(http.StatusBadRequest, statusCode, "product creation with invalid criticality returns 400 Bad Request")
		})
	}, allure.WithOutputDir("../../test-results/allure")))
	t.Run("CreateProductWithUnexistingWorkspace", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Product")
		t.Story("Create product")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject create product in unexisting workspace")
		resetDatabase(t)
		testRequest := product.CreateRequestV1{
			Name:         "Test Product",
			Criticality:  inventory.CriticalityMissionCritical,
			OwningTeamID: nil,
			Description:  nil,
			ProductCode:  "TP",
		}
		_, statusCode := createTestProduct(t, client, 1, testRequest)
		allure.Step(t, "verify rejection for missing workspace", func(t T) {
			t.Require().Equal(http.StatusNotFound, statusCode, "product creation in a missing workspace returns 404 Not Found")
		})
	}, allure.WithOutputDir("../../test-results/allure")))
	t.Run("CreateProductWithInvalidName", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Product")
		t.Story("Create product")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject create product with invalid name")
		resetDatabase(t)
		workspace, statusCode := createTestWorkspace(t, environment.server.URL, client, "Test Workspace")
		allure.Step(t, "verify prerequisite workspace", func(t T) {
			t.Require().Equal(http.StatusCreated, statusCode, "workspace creation returns 201 Created")
		})
		testRequest := product.CreateRequestV1{
			Name:         "<><f1ffsdf!,.<",
			Criticality:  inventory.CriticalityMissionCritical,
			OwningTeamID: nil,
			Description:  nil,
			ProductCode:  "TP",
		}
		_, statusCode = createTestProduct(t, client, workspace.ID, testRequest)
		allure.Step(t, "verify rejection for invalid product name", func(t T) {
			t.Require().Equal(http.StatusBadRequest, statusCode, "product creation with an invalid name returns 400 Bad Request")
		})
	}, allure.WithOutputDir("../../test-results/allure")))
	t.Run("CreateProductWithInvalidProductCode", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Product")
		t.Story("Create product")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject create product with invalid product code")
		resetDatabase(t)
		workspace, statusCode := createTestWorkspace(t, environment.server.URL, client, "Test Workspace")
		allure.Step(t, "verify prerequisite workspace", func(t T) {
			t.Require().Equal(http.StatusCreated, statusCode, "workspace creation returns 201 Created")
		})
		testRequest := product.CreateRequestV1{
			Name:         "Test Product",
			Criticality:  inventory.CriticalityMissionCritical,
			OwningTeamID: nil,
			Description:  nil,
			ProductCode:  "<<ft12>",
		}
		_, statusCode = createTestProduct(t, client, workspace.ID, testRequest)
		allure.Step(t, "verify rejection for invalid product code", func(t T) {
			t.Require().Equal(http.StatusBadRequest, statusCode, "product creation with an invalid code returns 400 Bad Request")
		})
	}, allure.WithOutputDir("../../test-results/allure")))
	t.Run("DeleteProductExistingProduct", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Product")
		t.Story("Delete product")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "positive")
		t.Title("Delete product existing product")
		resetDatabase(t)
		workspace, statusCode := createTestWorkspace(t, environment.server.URL, client, "Test Workspace")
		allure.Step(t, "verify prerequisite workspace", func(t T) {
			t.Require().Equal(http.StatusCreated, statusCode, "workspace creation returns 201 Created")
		})
		testRequest := product.CreateRequestV1{
			Name:         "Test Product",
			Criticality:  inventory.CriticalityMissionCritical,
			OwningTeamID: nil,
			Description:  nil,
			ProductCode:  "TEST",
		}
		createdProduct, statusCode := createTestProduct(t, client, workspace.ID, testRequest)
		allure.Step(t, "verify prerequisite product", func(t T) {
			t.Require().Equal(http.StatusCreated, statusCode, "product creation returns 201 Created")
		})
		statusCode = deleteTestProduct(t, client, createdProduct.ID)
		allure.Step(t, "verify product deletion", func(t T) {
			t.Require().Equal(http.StatusNoContent, statusCode, "product deletion returns 204 No Content")
		})
	}, allure.WithOutputDir("../../test-results/allure")))
	t.Run("DeleteUnexistingProduct", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Product")
		t.Story("Delete product")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Delete unexisting product")
		resetDatabase(t)
		statusCode := deleteTestProduct(t, client, 1)
		allure.Step(t, "verify deletion of missing product", func(t T) {
			t.Require().Equal(http.StatusNotFound, statusCode, "deleting a missing product returns 404 Not Found")
		})
	}, allure.WithOutputDir("../../test-results/allure")))
	t.Run("CreateTwoProductsWithSameProductCode", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Product")
		t.Story("Create product")
		t.Severity(allure.SeverityCritical)
		t.Tags("e2e", "negative")
		t.Title("Reject create product with existing product code")
		resetDatabase(t)
		workspace, statusCode := createTestWorkspace(t, environment.server.URL, client, "Test Workspace")
		allure.Step(t, "verify prerequisite workspace", func(t T) {
			t.Require().Equal(http.StatusCreated, statusCode, "workspace creation returns 201 Created")
		})
		testRequest := product.CreateRequestV1{
			Name:         "Test Product_2",
			Criticality:  inventory.CriticalityMissionCritical,
			OwningTeamID: nil,
			Description:  nil,
			ProductCode:  "TRD",
		}
		_, statusCode = createTestProduct(t, client, workspace.ID, testRequest)
		allure.Step(t, "verify first product creation", func(t T) {
			t.Require().Equal(http.StatusCreated, statusCode, "first product creation returns 201 Created")
		})
		_, statusCode = createTestProduct(t, client, workspace.ID, testRequest)
		allure.Step(t, "verify second product with same product code is rejected", func(t T) {
			t.Require().Equal(http.StatusConflict, statusCode, "second product creation returns 409 Conflict")
		})
	}, allure.WithOutputDir("../../test-results/allure")))
}

func createTestProduct(t T,
	client *http.Client,
	workspaceID int64,
	testReq product.CreateRequestV1) (product.ResponseV1, int) {
	t.Helper()
	createRouteV1 := environment.server.URL + "/v1/workspaces/" + strconv.Itoa(int(workspaceID)) + "/products"

	createRequest := product.CreateRequestV1{
		Name:         testReq.Name,
		OwningTeamID: testReq.OwningTeamID,
		Description:  testReq.Description,
		Criticality:  testReq.Criticality,
		ProductCode:  testReq.ProductCode,
	}
	requestBody, attachment := marshalRequestBody(t, createRequest)
	req, err := http.NewRequest(http.MethodPost, createRouteV1, requestBody)
	allure.Step(t, "build product creation request", func(t T) {
		t.Require().NoError(err, "product creation request is built without error")
	})

	t.Attach(fmt.Sprintf("Send create %q product", testReq.Name), allureJSONAttachment(t, attachment))

	resp, err := client.Do(req)
	allure.Step(t, "send product creation request", func(t T) {
		t.Require().NoError(err, "product creation request is sent without error")
	})

	createdProduct, attachment := unmarshalResponseBody[product.ResponseV1](t, resp)
	t.Attach("Received product response", allureJSONAttachment(t, attachment))
	return createdProduct, resp.StatusCode
}
func deleteTestProduct(t T,
	client *http.Client,
	productID int64) int {
	t.Helper()
	deleteRouteV1 := environment.server.URL + "/v1/products/" + strconv.Itoa(int(productID))
	req, err := http.NewRequest(http.MethodDelete, deleteRouteV1, nil)
	allure.Step(t, "build product deletion request", func(t T) {
		t.Require().NoError(err, "product deletion request is built without error")
	})
	resp, err := client.Do(req)
	allure.Step(t, "send product deletion request", func(t T) {
		t.Require().NoError(err, "product deletion request is sent without error")
	})
	return resp.StatusCode
}
