package errmap

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"unicode"

	postgres "github.com/76parker/alpa/internal/adapters/postgres"
	"github.com/76parker/alpa/internal/domain/inventory"
	"github.com/76parker/alpa/pkg/httputil"
	"github.com/go-playground/validator/v10"
)

type Code string

const (
	CodeInvalidID                    Code = "invalid_id"
	CodeInvalidWorkspaceName         Code = "invalid_workspace_name"
	CodeInvalidProductName           Code = "invalid_product_name"
	CodeInvalidCriticality           Code = "invalid_criticality"
	CodeInvalidComponentName         Code = "invalid_component_name"
	CodeUnknownComponentType         Code = "unknown_component_type"
	CodeUnknownBroker                Code = "unknown_broker"
	CodeEmptyComponentDetails        Code = "empty_component_details"
	CodeInvalidComponentDetails      Code = "invalid_component_details"
	CodeComponentDetailsTypeMismatch Code = "component_details_type_mismatch"
	CodeInvalidComponentDescription  Code = "invalid_component_description"
	CodeInvalidAPIName               Code = "invalid_api_name"
	CodeUnknownAPIType               Code = "unknown_api_type"
	CodeInvalidNetworkExposure       Code = "invalid_network_exposure"
	CodeInvalidRequest               Code = "invalid_request"
	CodeInvalidPagination            Code = "invalid_pagination"
	CodeInvalidConsumerAPILink       Code = "invalid_consumer_api_link"
	CodeConsumerAPILinkAlreadyExists Code = "consumer_api_link_already_exists"
	CodeNotFound                     Code = "not_found"
	CodeInternal                     Code = "internal"
	CodeAlreadyExists                Code = "resource_already_exists"
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
	case errors.Is(err, inventory.ErrNegativeID), errors.Is(err, httputil.ErrInvalidID):
		return newBadRequest(CodeInvalidID, "id must be positive"), true
	case errors.Is(err, inventory.ErrInvalidWorkspaceName):
		return newBadRequest(CodeInvalidWorkspaceName, "invalid workspace name"), true
	case errors.Is(err, inventory.ErrInvalidProductName):
		return newBadRequest(CodeInvalidProductName, "invalid product name"), true
	case errors.Is(err, inventory.ErrInvalidCriticality):
		return newBadRequest(CodeInvalidCriticality, "invalid criticality"), true
	case errors.Is(err, inventory.ErrInvalidComponentName):
		return newBadRequest(CodeInvalidComponentName, "invalid component name"), true
	case errors.Is(err, inventory.ErrUnknownComponentType):
		return newBadRequest(CodeUnknownComponentType, "unknown component type"), true
	case errors.Is(err, inventory.ErrUnknownBroker):
		return newBadRequest(CodeUnknownBroker, "unknown broker"), true
	case errors.Is(err, inventory.ErrEmptyDetails):
		return newBadRequest(CodeEmptyComponentDetails, "component details cannot be empty"), true
	case errors.Is(err, inventory.ErrInvalidDetails):
		return newBadRequest(CodeInvalidComponentDetails, "invalid component details"), true
	case errors.Is(err, inventory.ErrComponentDetailsTypeMismatch):
		return newBadRequest(CodeComponentDetailsTypeMismatch, inventory.ErrComponentDetailsTypeMismatch.Error()), true
	case errors.Is(err, inventory.ErrInvalidDescription):
		return newBadRequest(CodeInvalidComponentDescription, "invalid component description"), true
	case errors.Is(err, inventory.ErrInvalidAPIName):
		return newBadRequest(CodeInvalidAPIName, "invalid api name"), true
	case errors.Is(err, inventory.ErrUnknownAPIType):
		return newBadRequest(CodeUnknownAPIType, "unknown api type"), true
	case errors.Is(err, inventory.ErrInvalidExposure):
		return newBadRequest(CodeInvalidNetworkExposure, "invalid network exposure"), true
	case errors.Is(err, inventory.ErrConsumerAPIHasSameProvider):
		return newBadRequest(CodeInvalidConsumerAPILink, "component cannot consume its own api"), true
	case errors.Is(err, inventory.ErrConsumerAPIAlreadyExists):
		return newError("consumer api link already exists", CodeConsumerAPILinkAlreadyExists, http.StatusConflict), true
	case errors.Is(err, postgres.ErrNotFound):
		return newError("resource not found", CodeNotFound, http.StatusNotFound), true
	case errors.Is(err, postgres.ErrUniqueViolation):
		return newError("resource with this name/code already exists", CodeAlreadyExists, http.StatusConflict), true
	case errors.Is(err, ErrInvalidRequest),
		errors.Is(err, httputil.ErrInvalidJSONBody):
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
		validationErrorCode(fieldError),
		validationErrorMessage(fieldError),
	)
}

func validationErrorCode(fieldError validator.FieldError) Code {
	switch fieldError.Field() {
	case "criticality":
		return CodeInvalidCriticality
	case "type":
		return CodeUnknownComponentType
	case "broker":
		return CodeUnknownBroker
	case "api_type":
		return CodeUnknownAPIType
	case "network_exposure":
		return CodeInvalidNetworkExposure
	default:
		return CodeInvalidRequest
	}
}

func validationErrorMessage(fieldError validator.FieldError) string {
	field := fieldError.Field()
	if field == "type" {
		field = "component type"
	}

	switch fieldError.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", field)
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
	case "gt":
		return fmt.Sprintf("%s must be greater than %s", field, fieldError.Param())
	case "oneof":
		return fmt.Sprintf(
			"%s must be one of: %s",
			field,
			strings.Join(splitValidationOptions(fieldError.Param()), ", "),
		)
	case "allowed_text":
		return fmt.Sprintf("%s contains unsupported characters", field)
	case "product_code":
		return fmt.Sprintf("%s must contain only uppercase Latin letters", field)
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

func splitValidationOptions(param string) []string {
	options := make([]string, 0)
	var current strings.Builder
	quoted := false

	appendOption := func() {
		if current.Len() == 0 {
			return
		}
		options = append(options, current.String())
		current.Reset()
	}

	for _, r := range param {
		switch {
		case r == '\'':
			quoted = !quoted
		case unicode.IsSpace(r) && !quoted:
			appendOption()
		default:
			current.WriteRune(r)
		}
	}
	appendOption()

	return options
}

func newError(message string, code Code, status int) Error {
	return Error{Message: message, Code: code, Status: status}
}

func newBadRequest(code Code, message string) Error {
	return newError(message, code, http.StatusBadRequest)
}
