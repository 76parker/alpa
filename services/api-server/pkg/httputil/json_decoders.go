package httputil

import (
	"encoding/json/v2"
	"errors"
	"fmt"
	"io"
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

var (
	ErrInvalidJSONBody  = errors.New("invalid JSON body")
	ErrJSONBodyTooLarge = errors.New("JSON body too large")
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
		return isAllowedText(field.Field().String())
	}); err != nil {
		return nil, fmt.Errorf("register allowed_text validation: %w", err)
	}
	if err := validate.RegisterValidation("max_non_whitespace", func(field validator.FieldLevel) bool {
		limit, err := strconv.Atoi(field.Param())
		if err != nil || limit < 0 {
			return false
		}
		characterCount := 0
		for _, character := range field.Field().String() {
			if unicode.IsSpace(character) {
				continue
			}
			characterCount++
			if characterCount > limit {
				return false
			}
		}
		return true
	}); err != nil {
		return nil, fmt.Errorf("register max_non_whitespace validation: %w", err)
	}
	return validate, nil
}

func isAllowedText(value string) bool {
	if !utf8.ValidString(value) {
		return false
	}

	for _, character := range value {
		if unicode.IsControl(character) && character != '\t' && character != '\n' && character != '\r' {
			return false
		}
	}
	return true
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
