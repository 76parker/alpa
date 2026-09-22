package errmap

import (
	"errors"
	"fmt"
	"net/http"

	postgres "github.com/76parker/alpa/internal/adapters/postgres"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/go-playground/validator/v10"
)

type Code string

const (
	CodeUnknownTechnologyName          Code = "unknown_technology_name"
	CodeUnknownLanguage                Code = "unknown_language"
	CodeUnknownTechnologyType          Code = "unknown_technology_type"
	CodeTooManyEndpoints               Code = "too_many_endpoints"
	CodeInvalidProductCode             Code = "invalid_product_code"
	CodeInvalidID                      Code = "invalid_id"
	CodeInvalidWorkspaceName           Code = "invalid_workspace_name"
	CodeInvalidProductName             Code = "invalid_product_name"
	CodeInvalidCriticality             Code = "invalid_criticality"
	CodeInvalidImportancy              Code = "invalid_importancy"
	CodeInvalidComponentName           Code = "invalid_component_name"
	CodeUnknownComponentType           Code = "unknown_component_type"
	CodeEmptyComponentDetails          Code = "empty_component_details"
	CodeInvalidComponentDetails        Code = "invalid_component_details"
	CodeComponentDetailsTypeMismatch   Code = "component_details_type_mismatch"
	CodeInvalidComponentDescription    Code = "invalid_component_description"
	CodeUnknownAPIType                 Code = "unknown_api_type"
	CodeInvalidAPIName                 Code = "invalid_api_name"
	CodeInvalidNetworkExposure         Code = "invalid_network_exposure"
	CodeAPILimitExceeded               Code = "api_limit_exceeded"
	CodeInvalidClientType              Code = "invalid_client_type"
	CodeClientLimitExceeded            Code = "client_limit_exceeded"
	CodeClientCapabilitiesTooLarge     Code = "client_capabilities_too_large"
	CodeInvalidClientAction            Code = "invalid_client_action"
	CodeInvalidIntegration             Code = "invalid_integration"
	CodeIntegrationAlreadyExists       Code = "integration_already_exists"
	CodeClientAlreadyExists            Code = "client_already_exists"
	CodeIncompatibleClientIntegrations Code = "incompatible_client_integrations"
	CodeInvalidRequest                 Code = "invalid_request"
	CodeInvalidPagination              Code = "invalid_pagination"
	CodeNotFound                       Code = "not_found"
	CodeInternal                       Code = "internal"
	CodeAlreadyExists                  Code = "resource_already_exists"
)

var (
	ErrInvalidRequest = errors.New("httpapi: invalid request")

	UnexpectedError = Error{
		Message: "unexpected error",
		Code:    CodeInternal,
		Status:  http.StatusInternalServerError,
	}
)

type Error struct {
	Message string `json:"message"`
	Code    Code   `json:"code"`
	Status  int    `json:"status"`
}

func Resolve(err error) (Error, bool) {
	var validationErrors validator.ValidationErrors

	switch {
	case errors.Is(err, inventory.ErrUnknownTechnologyName):
		return newBadRequest(CodeUnknownTechnologyName, "unknown technology name"), true
	case errors.Is(err, inventory.ErrUnknownLanguage):
		return newBadRequest(CodeUnknownLanguage, "unknown language"), true
	case errors.Is(err, inventory.ErrUnknownTechnologyType):
		return newBadRequest(CodeUnknownTechnologyType, "unknown technology type"), true
	case errors.Is(err, inventory.ErrTooManyEndpoints):
		return newBadRequest(CodeTooManyEndpoints, "at most 10 endpoints are allowed"), true
	case errors.Is(err, inventory.ErrInvalidProductCode):
		return newBadRequest(CodeInvalidProductCode, "product code must contain only uppercase Latin letters"), true
	case errors.Is(err, inventory.ErrNegativeID):
		return newBadRequest(CodeInvalidID, "id must be positive"), true
	case errors.Is(err, inventory.ErrInvalidWorkspaceName):
		return newBadRequest(CodeInvalidWorkspaceName, "invalid workspace name"), true
	case errors.Is(err, inventory.ErrInvalidProductName):
		return newBadRequest(CodeInvalidProductName, "invalid product name"), true
	case errors.Is(err, inventory.ErrInvalidCriticality):
		return newBadRequest(CodeInvalidCriticality, "invalid criticality"), true
	case errors.Is(err, inventory.ErrInvalidInfrastructureCriticality):
		return newBadRequest(CodeInvalidImportancy, "invalid importancy"), true
	case errors.Is(err, inventory.ErrInvalidComponentName):
		return newBadRequest(CodeInvalidComponentName, "invalid component name"), true
	case errors.Is(err, inventory.ErrUnknownComponentType):
		return newBadRequest(CodeUnknownComponentType, "unknown component type"), true
	case errors.Is(err, inventory.ErrEmptyDetails):
		return newBadRequest(CodeEmptyComponentDetails, "component details cannot be empty"), true
	case errors.Is(err, inventory.ErrInvalidDetails):
		return newBadRequest(CodeInvalidComponentDetails, "invalid component details"), true
	case errors.Is(err, inventory.ErrComponentDetailsTypeMismatch):
		return newBadRequest(CodeComponentDetailsTypeMismatch, inventory.ErrComponentDetailsTypeMismatch.Error()), true
	case errors.Is(err, inventory.ErrInvalidDescription):
		return newBadRequest(CodeInvalidComponentDescription, "invalid component description"), true
	case errors.Is(err, inventory.ErrUnknownAPIType):
		return newBadRequest(CodeUnknownAPIType, "unknown api type"), true
	case errors.Is(err, inventory.ErrInvalidAPIName):
		return newBadRequest(CodeInvalidAPIName, "invalid api name"), true
	case errors.Is(err, inventory.ErrInvalidExposure):
		return newBadRequest(CodeInvalidNetworkExposure, "invalid network exposure"), true
	case errors.Is(err, inventory.ErrAPILimitExceeded):
		return newBadRequest(CodeAPILimitExceeded, inventory.ErrAPILimitExceeded.Error()), true
	case errors.Is(err, inventory.ErrInvalidClientType):
		return newBadRequest(CodeInvalidClientType, "invalid client type"), true
	case errors.Is(err, inventory.ErrClientLimitExceeded):
		return newBadRequest(CodeClientLimitExceeded, inventory.ErrClientLimitExceeded.Error()), true
	case errors.Is(err, inventory.ErrCapabilitiesTooLarge):
		return newBadRequest(CodeClientCapabilitiesTooLarge, "client capabilities must be at most 2 MiB in UTF-8"), true
	case errors.Is(err, inventory.ErrInvalidClientAction):
		return newBadRequest(CodeInvalidClientAction, "invalid client action"), true
	case errors.Is(err, inventory.ErrInvalidIntegration):
		return newBadRequest(CodeInvalidIntegration, "invalid integration"), true
	case errors.Is(err, inventory.ErrInvalidIntegrationDescription):
		return newBadRequest(CodeInvalidRequest, "invalid integration description"), true
	case errors.Is(err, inventory.ErrClientAlreadyExists):
		return newError("client type already exists for component", CodeClientAlreadyExists, http.StatusConflict), true
	case errors.Is(err, inventory.ErrIntegrationAlreadyExists):
		return newError("integration already exists", CodeIntegrationAlreadyExists, http.StatusConflict), true
	case errors.Is(err, inventory.ErrIncompatibleClientIntegrations):
		return newError(
			"client type is incompatible with existing integrations",
			CodeIncompatibleClientIntegrations,
			http.StatusConflict,
		), true
	case errors.Is(err, postgres.ErrNotFound):
		return newError("resource not found", CodeNotFound, http.StatusNotFound), true
	case errors.Is(err, postgres.ErrUniqueViolation):
		return newError("resource with this name/code already exists", CodeAlreadyExists, http.StatusConflict), true
	case errors.Is(err, ErrInvalidRequest),
		errors.Is(err, httputil.ErrInvalidJSONBody),
		errors.Is(err, httputil.ErrInvalidID):
		return newBadRequest(CodeInvalidRequest, "invalid request"), true
	case errors.Is(err, httputil.ErrJSONBodyTooLarge):
		return newBadRequest(CodeInvalidRequest, "request body too large"), true
	case errors.As(err, &validationErrors):
		return resolveValidationError(validationErrors), true
	case errors.Is(err, httputil.ErrInvalidOffset),
		errors.Is(err, httputil.ErrInvalidLimit),
		errors.Is(err, httputil.ErrInvalidPaginationRange):
		return newBadRequest(CodeInvalidPagination, "invalid pagination"), true
	default:
		return Error{}, false
	}
}

func resolveValidationError(validationErrors validator.ValidationErrors) Error {
	if len(validationErrors) == 0 {
		return newBadRequest(CodeInvalidRequest, "invalid request")
	}

	fieldError := validationErrors[0]
	return newBadRequest(
		CodeInvalidRequest,
		validationErrorMessage(fieldError),
	)
}

func validationErrorMessage(fieldError validator.FieldError) string {
	field := fieldError.Field()
	if field == "type" {
		field = "component type"
	}

	switch fieldError.Tag() {
	case "min":
		return fmt.Sprintf(
			"%s must be at least %s %s long",
			field,
			fieldError.Param(),
			characterUnit(fieldError.Param()),
		)
	case "max":
		return fmt.Sprintf(
			"%s must be at most %s %s long",
			field,
			fieldError.Param(),
			characterUnit(fieldError.Param()),
		)
	case "max_non_whitespace":
		return fmt.Sprintf("%s must be at most %s non-whitespace characters long", field, fieldError.Param())
	case "allowed_text":
		return fmt.Sprintf("%s contains unsupported characters", field)
	default:
		return fmt.Sprintf("%s is invalid", field)
	}
}

func characterUnit(limit string) string {
	if limit == "1" {
		return "character"
	}
	return "characters"
}

func newError(message string, code Code, status int) Error {
	return Error{Message: message, Code: code, Status: status}
}

func newBadRequest(code Code, message string) Error {
	return newError(message, code, http.StatusBadRequest)
}
