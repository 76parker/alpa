package integrations

import (
	"context"
	"net/http"

	appintegration "github.com/76parker/alpa/internal/applications/inventory/integration"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/76parker/alpa/internal/httpapi/errmap"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type application interface {
	Create(ctx context.Context, command appintegration.CreateCommand) (inventory.Integration, error)
	UpdateDescription(
		ctx context.Context,
		command appintegration.UpdateDescriptionCommand,
	) (inventory.Integration, error)
	Delete(ctx context.Context, integrationID int64) error
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
	created, err := h.application.Create(c.Request.Context(), appintegration.CreateCommand{
		ClientID:    request.ClientID,
		APIID:       request.APIID,
		Action:      request.Action,
		Description: request.Description,
	})
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.JSON(http.StatusCreated, NewResponseV1(created))
}

func (h *Handler) UpdateDescription(c *gin.Context) {
	integrationID, err := httputil.ParseID(c, "id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	request, err := httputil.DecodeAndValidateJSON[UpdateDescriptionRequestV1](c, h.validator)
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	description, isSet := request.Description.Value()
	if !isSet {
		httputil.FailRequest(c, errmap.ErrInvalidRequest)
		return
	}
	if description != nil {
		if err := h.validator.Var(*description, "min=1,max=1000,allowed_text"); err != nil {
			httputil.FailRequest(c, err)
			return
		}
	}
	updated, err := h.application.UpdateDescription(c.Request.Context(), appintegration.UpdateDescriptionCommand{
		IntegrationID: integrationID,
		Description:   description,
	})
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.JSON(http.StatusOK, NewResponseV1(updated))
}

func (h *Handler) Delete(c *gin.Context) {
	integrationID, err := httputil.ParseID(c, "id")
	if err != nil {
		httputil.FailRequest(c, err)
		return
	}
	if err := h.application.Delete(c.Request.Context(), integrationID); err != nil {
		httputil.FailRequest(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
