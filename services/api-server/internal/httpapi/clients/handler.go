package clients

import (
	"context"
	"net/http"

	appclients "github.com/76parker/alpa/internal/applications/inventory/client"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type application interface {
	Create(ctx context.Context, command appclients.CreateCommand) (inventory.ComponentClient, error)
	Update(ctx context.Context, command appclients.UpdateCommand) (inventory.ComponentClient, error)
	Delete(ctx context.Context, componentID int64, clientID int64) error
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

	created, err := h.application.Create(c.Request.Context(), appclients.CreateCommand{
		ComponentID:      componentID,
		ClientName:       request.ClientName,
		Capabilities:     request.Capabilities,
		SecureConnection: request.SecureConnection,
	})
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}

	c.JSON(http.StatusCreated, NewResponseV1(created))
}

func (h *Handler) Update(c *gin.Context) {
	componentID, err := httputil.ParseID(c, "component_id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	clientID, err := httputil.ParseID(c, "id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	request, err := httputil.DecodeAndValidateJSON[UpdateRequestV1](c, h.validator)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	updated, err := h.application.Update(c.Request.Context(), appclients.UpdateCommand{
		ComponentID:      componentID,
		ClientID:         clientID,
		ClientName:       request.ClientName,
		Capabilities:     request.Capabilities,
		SecureConnection: request.SecureConnection,
	})
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.JSON(http.StatusOK, NewResponseV1(updated))
}

func (h *Handler) Delete(c *gin.Context) {
	componentID, err := httputil.ParseID(c, "component_id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	clientID, err := httputil.ParseID(c, "id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	if err := h.application.Delete(c.Request.Context(), componentID, clientID); err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
