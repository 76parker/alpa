package e2e_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/76parker/alpa/internal/httpapi/workspace"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/ozontech/testo"
	allure "github.com/ozontech/testo-allure"
)

type T struct {
	*testo.T
	*allure.PluginAllure
}

func TestWorkspaceE2E(t *testing.T) {
	serverURL := environment.server.URL
	client := environment.server.Client()
	t.Run("CreateAndGetWorkspace", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Workspace")
		t.Story("Create workspace")
		t.Tags("e2e", "positive")
		t.Severity(allure.SeverityCritical)
		t.Title("Create workspace and retrieve it")

		resetDatabase(t)

		expectedName := "Test Workspace"

		createdWorkspace, statusCode := createTestWorkspace(t, serverURL, client, expectedName)
		allure.Step(t, "verify created workspace", func(t T) {
			t.Assert().Equal(http.StatusCreated, statusCode, "workspace creation returns 201 Created")
			t.Assert().Equal(expectedName, createdWorkspace.Name, "created workspace has the requested name")
		})
	}, allure.WithOutputDir("../../test-results/allure")))

	t.Run("InvalidCreateRequest", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Workspace")
		t.Story("Create workspace")
		t.Tags("e2e", "negative")
		t.Severity(allure.SeverityCritical)
		t.Title("Reject workspace with invalid name")
		resetDatabase(t)

		_, statusCode := createTestWorkspace(t, serverURL, client, "")
		allure.Step(t, "verify rejection for invalid workspace name", func(t T) {
			t.Assert().Equal(http.StatusBadRequest, statusCode, "workspace creation with an invalid name returns 400 Bad Request")
		})
	}, allure.WithOutputDir("../../test-results/allure")))

	// Listing must preserve repository order and expose the requested page metadata.
	t.Run("ListWorkspacesWithPagination", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Workspace")
		t.Story("List workspaces")
		t.Tags("e2e", "positive")
		t.Severity(allure.SeverityCritical)
		t.Title("List workspaces in creation order with pagination")
		resetDatabase(t)

		for _, name := range []string{"Workspace Alpha", "Workspace Beta", "Workspace Gamma"} {
			_, statusCode := createTestWorkspace(t, serverURL, client, name)
			t.Require().Equal(http.StatusCreated, statusCode, "workspace prerequisite is created")
		}

		response, statusCode := listTestWorkspaces(t, serverURL, client, "?limit=2&offset=1")
		allure.Step(t, "verify paginated workspace list", func(t T) {
			t.Require().Equal(http.StatusOK, statusCode, "workspace list returns 200 OK")
			t.Require().Len(response.Data, 2, "workspace list returns the requested page size")
			t.Assert().Equal("Workspace Beta", response.Data[0].Name, "workspace list preserves ascending creation order")
			t.Assert().Equal("Workspace Gamma", response.Data[1].Name, "workspace list preserves ascending creation order")
			t.Assert().Equal(2, response.Pagination.Limit, "workspace list returns the requested limit")
			t.Assert().Equal(1, response.Pagination.Offset, "workspace list returns the requested offset")
		})
	}, allure.WithOutputDir("../../test-results/allure")))

	// Invalid pagination must be rejected before the application list operation runs.
	t.Run("RejectInvalidListPagination", testo.Test(func(t T) {
		t.Epic("Inventory")
		t.Feature("Workspace")
		t.Story("List workspaces")
		t.Tags("e2e", "negative")
		t.Severity(allure.SeverityNormal)
		t.Title("Reject invalid workspace list pagination")
		resetDatabase(t)

		_, statusCode := listTestWorkspaces(t, serverURL, client, "?limit=101")
		allure.Step(t, "verify invalid pagination response", func(t T) {
			t.Assert().Equal(http.StatusBadRequest, statusCode, "workspace list rejects limits above 100")
		})
	}, allure.WithOutputDir("../../test-results/allure")))
}

func createTestWorkspace(t T, serverURL string, client *http.Client, workspaceName string) (workspace.ResponseV1, int) {
	t.Helper()
	createRouteV1 := serverURL + "/v1/workspaces"
	requestBody, allureAttachment := marshalRequestBody(t, workspace.CreateRequestV1{Name: workspaceName})
	attachName := fmt.Sprintf("Send create %q workspace request", workspaceName)
	t.Attach(attachName, allure.AttachmentBytes{Data: allureAttachment, MediaType: allure.DocumentJSON})

	request, err := http.NewRequestWithContext(t.Context(), http.MethodPost, createRouteV1, requestBody)
	allure.Step(t, "build workspace creation request", func(t T) {
		t.Require().NoError(err, "workspace creation request is built without error")
	})
	request.Header.Set("Content-Type", "application/json")

	response, err := client.Do(request)
	allure.Step(t, "send workspace creation request", func(t T) {
		t.Require().NoError(err, "workspace creation request is sent without error")
	})
	defer response.Body.Close()
	attachName = "Received workspace response"
	createdWorkspace, allureAttachment := unmarshalResponseBody[workspace.ResponseV1](t, response)
	t.Attach(attachName, allure.AttachmentBytes{Data: allureAttachment, MediaType: allure.DocumentJSON})
	return createdWorkspace, response.StatusCode
}

func listTestWorkspaces(
	t T,
	serverURL string,
	client *http.Client,
	query string,
) (httputil.ListResponse[workspace.ResponseV1], int) {
	t.Helper()
	request, err := http.NewRequestWithContext(t.Context(), http.MethodGet, serverURL+"/v1/workspaces"+query, nil)
	allure.Step(t, "build workspace list request", func(t T) {
		t.Require().NoError(err, "workspace list request is built without error")
	})

	response, err := client.Do(request)
	allure.Step(t, "send workspace list request", func(t T) {
		t.Require().NoError(err, "workspace list request is sent without error")
	})
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return httputil.ListResponse[workspace.ResponseV1]{}, response.StatusCode
	}

	listResponse, attachment := unmarshalResponseBody[httputil.ListResponse[workspace.ResponseV1]](t, response)
	t.Attach("Received workspace list response", allureJSONAttachment(t, attachment))
	return listResponse, response.StatusCode
}
