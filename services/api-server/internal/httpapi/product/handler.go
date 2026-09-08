package product

import (
	"context"
	"net/http"

	appproduct "github.com/76parker/alpa/internal/applications/inventory/product"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type application interface {
	Create(ctx context.Context, input appproduct.CreateCommand) (inventory.Product, error)
	Get(ctx context.Context, id int64) (inventory.Product, error)
	ListByWorkspace(ctx context.Context, workspaceID int64, limit, offset int) ([]inventory.Product, error)
	Delete(ctx context.Context, id int64) error
}

type Handler struct {
	application application
	validator   *validator.Validate
}

func NewHandler(application application, validate *validator.Validate) *Handler {
	return &Handler{application: application, validator: validate}
}

func (h *Handler) Create(c *gin.Context) {
	workspaceID, err := httputil.ParseID(c, "workspace_id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	request, err := httputil.DecodeAndValidateJSON[CreateRequestV1](c, h.validator)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	product, err := h.application.Create(c.Request.Context(), appproduct.CreateCommand{
		WorkspaceID:  workspaceID,
		OwningTeamID: request.OwningTeamID,
		ProductCode:  request.ProductCode,
		Name:         request.Name,
		Criticality:  request.Criticality,
		Description:  request.Description,
	})
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.JSON(http.StatusCreated, NewResponseV1(product))
}

func (h *Handler) Get(c *gin.Context) {
	id, err := httputil.ParseID(c, "product_id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	product, err := h.application.Get(c.Request.Context(), id)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.JSON(http.StatusOK, NewResponseV1(product))
}

func (h *Handler) List(c *gin.Context) {
	workspaceID, err := httputil.ParseID(c, "workspace_id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	pagination, err := httputil.ParsePagination(c)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	items, err := h.application.ListByWorkspace(c.Request.Context(), workspaceID, pagination.Limit, pagination.Offset)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	data := make([]ResponseV1, 0, len(items))
	for _, product := range items {
		data = append(data, NewResponseV1(product))
	}
	response := httputil.ListResponse[ResponseV1]{Data: data, Pagination: httputil.PaginationResponse{Limit: pagination.Limit, Offset: pagination.Offset}}
	c.JSON(http.StatusOK, response)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := httputil.ParseID(c, "product_id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	if err := h.application.Delete(c.Request.Context(), id); err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
