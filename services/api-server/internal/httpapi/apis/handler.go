package apis

import (
	"context"
	"net/http"

	appapis "github.com/76parker/alpa/internal/applications/inventory/apis"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type application interface {
	Create(ctx context.Context, command appapis.CreateCommand) (inventory.ComponentAPI, error)
}

type Handler struct {
	application application
	validator   *validator.Validate
}

func NewHandler(application application, validate *validator.Validate) *Handler {
	return &Handler{application: application, validator: validate}
}

func (h *Handler) Create(c *gin.Context) {
	componentID, err := httputil.ParseID(c, "component_id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}

	request, err := httputil.DecodeAndValidateJSON[CreateRequestV1](c, h.validator)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}

	created, err := h.application.Create(c.Request.Context(), appapis.CreateCommand{
		ComponentID:     componentID,
		Name:            request.Name,
		APIType:         request.APIType,
		NetworkExposure: request.NetworkExposure,
	})
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}

	c.JSON(http.StatusCreated, NewResponseV1(created))
}
