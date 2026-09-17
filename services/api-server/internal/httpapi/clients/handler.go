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
	BindAPI(ctx context.Context, command appclients.BindAPICommand) (inventory.ComponentClient, error)
}
type Handler struct {
	application application
	validator   *validator.Validate
}

func NewHandler(application application, validate *validator.Validate) *Handler {
	return &Handler{application: application, validator: validate}
}

func (h *Handler) BindAPI(c *gin.Context) {
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
	request, err := httputil.DecodeAndValidateJSON[BindAPIRequestV1](c, h.validator)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}

	updated, err := h.application.BindAPI(c.Request.Context(), appclients.BindAPICommand{
		ComponentID: componentID,
		ClientID:    clientID,
		APIID:       request.APIID,
	})
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.JSON(http.StatusCreated, NewBindAPIResponseV1(updated))
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
		ComponentID:       componentID,
		ClientName:        request.ClientName,
		Role:              request.Role,
		CommunicationType: request.CommunicationType,
		Description:       httputil.OptionalString(request.Description),
	})
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}

	c.JSON(http.StatusCreated, NewResponseV1(created))
}
