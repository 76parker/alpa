package httputil

import (
	"encoding/json/v2"
	"errors"
	"fmt"
	"io"
	"net/http"
	"reflect"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

var (
	ErrInvalidJSONBody  = errors.New("invalid JSON body")
	ErrJSONBodyTooLarge = errors.New("JSON body too large")

	allowedTextPattern = regexp.MustCompile(`^[A-Za-z0-9 ._()@+:/#&',%\[\]-]*$`)
)

func NewValidator() (*validator.Validate, error) {
	validate := validator.New(validator.WithRequiredStructEnabled())
	validate.RegisterTagNameFunc(func(field reflect.StructField) string {
		name := strings.SplitN(field.Tag.Get("json"), ",", 2)[0]
		if name == "" || name == "-" {
			return field.Name
		}
		return name
	})
	if err := validate.RegisterValidation("allowed_text", func(field validator.FieldLevel) bool {
		return allowedTextPattern.MatchString(field.Field().String())
	}); err != nil {
		return nil, fmt.Errorf("register allowed_text validation: %w", err)
	}
	return validate, nil
}

func DecodeAndValidateJSON[T any](c *gin.Context, validate *validator.Validate) (T, error) {
	var result T
	body, err := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, MaxJSONBodySize))
	if err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			return result, fmt.Errorf("%w: read JSON body: %w", ErrJSONBodyTooLarge, err)
		}
		return result, fmt.Errorf("%w: read JSON body: %w", ErrInvalidJSONBody, err)
	}
	return DecodeAndValidateJSONBytes[T](body, validate)
}

func DecodeAndValidateJSONBytes[T any](body []byte, validate *validator.Validate) (T, error) {
	var result T
	if err := json.Unmarshal(body, &result, json.RejectUnknownMembers(true)); err != nil {
		return result, fmt.Errorf("%w: decode JSON body: %w", ErrInvalidJSONBody, err)
	}
	if normalizable, ok := any(&result).(interface{ Normalize() }); ok {
		normalizable.Normalize()
	}
	if err := validate.Struct(result); err != nil {
		return result, err
	}
	return result, nil
}

func DecodeJSON[T any](body []byte) (T, error) {
	var result T
	if err := json.Unmarshal(body, &result); err != nil {
		return result, fmt.Errorf("%w: decode JSON: %w", ErrInvalidJSONBody, err)
	}
	return result, nil
}
