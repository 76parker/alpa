package workspace

import (
	"context"
	"net/http"

	appworkspace "github.com/76parker/alpa/internal/applications/inventory/workspace"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type application interface {
	Create(ctx context.Context, input appworkspace.CreateCommand) (inventory.Workspace, error)
	Get(ctx context.Context, id int64) (inventory.Workspace, error)
	List(ctx context.Context, limit, offset int) ([]inventory.Workspace, error)
}

type Handler struct {
	application application
	validator   *validator.Validate
}

func NewHandler(application application, validate *validator.Validate) *Handler {
	return &Handler{application: application, validator: validate}
}

func (h *Handler) Create(c *gin.Context) {
	request, err := httputil.DecodeAndValidateJSON[CreateRequestV1](c, h.validator)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}

	workspace, err := h.application.Create(c.Request.Context(), appworkspace.CreateCommand{Name: request.Name})
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.JSON(http.StatusCreated, NewResponseV1(workspace))
}

func (h *Handler) Get(c *gin.Context) {
	id, err := httputil.ParseID(c, "workspace_id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	workspace, err := h.application.Get(c.Request.Context(), id)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.JSON(http.StatusOK, NewResponseV1(workspace))
}

func (h *Handler) List(c *gin.Context) {
	pagination, err := httputil.ParsePagination(c)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}

	items, err := h.application.List(c.Request.Context(), pagination.Limit, pagination.Offset)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}

	data := make([]ResponseV1, 0, len(items))
	for _, item := range items {
		data = append(data, NewResponseV1(item))
	}
	c.JSON(http.StatusOK, httputil.ListResponse[ResponseV1]{
		Data: data,
		Pagination: httputil.PaginationResponse{
			Limit:  pagination.Limit,
			Offset: pagination.Offset,
		},
	})
}
