package component

import (
	"context"
	"net/http"

	appcomponent "github.com/76parker/alpa/internal/applications/inventory/component"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type application interface {
	Create(ctx context.Context, input appcomponent.CreateInput) (inventory.Component, error)
	Get(ctx context.Context, id int64) (inventory.Component, error)
	ListByProduct(ctx context.Context, productID int64, limit int, offset int) ([]inventory.Component, error)
	Delete(ctx context.Context, id int64) error
	AddConsumerAPI(ctx context.Context, componentID, apiID int64) error
	RemoveConsumerAPI(ctx context.Context, componentID, apiID int64) error
}

type Handler struct {
	application application
	validator   *validator.Validate
}

func NewHandler(application application, validate *validator.Validate) *Handler {
	return &Handler{application: application, validator: validate}
}

func (h *Handler) AddConsumerAPI(c *gin.Context) {
	componentID, err := httputil.ParseID(c, "id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	request, err := httputil.DecodeAndValidateJSON[ConsumerAPICreateRequestV1](c, h.validator)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	if err := h.application.AddConsumerAPI(c.Request.Context(), componentID, request.APIID); err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) RemoveConsumerAPI(c *gin.Context) {
	componentID, err := httputil.ParseID(c, "id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	apiID, err := httputil.ParseID(c, "api_id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	if err := h.application.RemoveConsumerAPI(c.Request.Context(), componentID, apiID); err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) Create(c *gin.Context) {
	request, err := httputil.DecodeAndValidateJSON[CreateRequestV1](c, h.validator)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	details, err := decodeDetails(request.Type, request.Details, h.validator)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	apis := make([]appcomponent.APIInput, 0, len(request.APIs))
	for _, api := range request.APIs {
		apis = append(apis, appcomponent.APIInput{
			Name:     api.Name,
			APIType:  api.APIType,
			Exposure: api.NetworkExposure,
		})
	}
	input := appcomponent.CreateInput{
		ProductID:     request.ProductID,
		Name:          request.Name,
		Description:   stringValue(request.Description),
		APIs:          apis,
		ComponentType: request.Type,
		Details:       details,
	}
	component, err := h.application.Create(c.Request.Context(), input)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	response, err := NewResponseV1(component)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.JSON(http.StatusCreated, response)
}

func (h *Handler) Get(c *gin.Context) {
	id, err := httputil.ParseID(c, "id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	component, err := h.application.Get(c.Request.Context(), id)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	response, err := NewResponseV1(component)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *Handler) List(c *gin.Context) {
	productID, err := httputil.ParseID(c, "product_id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	pagination, err := httputil.ParsePagination(c)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	items, err := h.application.ListByProduct(c.Request.Context(), productID, pagination.Limit, pagination.Offset)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	data := make([]ResponseV1, 0, len(items))
	for _, component := range items {
		response, err := NewResponseV1(component)
		if err != nil {
			httputil.FailRequest(c, err)
			return
		}
		data = append(data, response)
	}
	response := httputil.ListResponse[ResponseV1]{Data: data, Pagination: httputil.PaginationResponse{Limit: pagination.Limit, Offset: pagination.Offset}}
	c.JSON(http.StatusOK, response)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := httputil.ParseID(c, "id")
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
