package httputil_test

import (
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/76parker/alpa/pkg/httputil"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type validationRequest struct {
	Name        string  `json:"name" validate:"max=50,allowed_text"`
	ProductCode string  `json:"product_code" validate:"max=10,allowed_text"`
	Description *string `json:"description,omitempty" validate:"omitempty,min=1,max=1000,allowed_text"`
}

func TestDecodeAndValidateJSONBytes(t *testing.T) {
	t.Parallel()

	validate, err := httputil.NewValidator()
	if err != nil {
		t.Fatalf("NewValidator() error = %v", err)
	}

	tests := []struct {
		name          string
		body          string
		want          validationRequest
		wantJSONError bool
		wantField     string
		wantTag       string
	}{
		{
			name: "valid",
			body: `{"name":"Checkout API","product_code":"PAY"}`,
			want: validationRequest{Name: "Checkout API", ProductCode: "PAY"},
		},
		{name: "malformed", body: `{`, wantJSONError: true},
		{name: "unknown top-level field", body: `{"name":"Checkout API","product_code":"PAY","unknown":true}`, wantJSONError: true},
		{name: "trailing JSON value", body: `{"name":"Checkout API","product_code":"PAY"} {}`, wantJSONError: true},
		{name: "missing field passes to domain", body: `{"product_code":"PAY"}`, want: validationRequest{ProductCode: "PAY"}},
		{name: "invalid allowed text", body: `{"name":"Продукт","product_code":"PAY"}`, wantField: "name", wantTag: "allowed_text"},
		{name: "product code format passes to domain", body: `{"name":"Checkout API","product_code":"pay"}`, want: validationRequest{Name: "Checkout API", ProductCode: "pay"}},
		{name: "empty optional description", body: `{"name":"Checkout API","product_code":"PAY","description":""}`, wantField: "description", wantTag: "min"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := httputil.DecodeAndValidateJSONBytes[validationRequest]([]byte(tt.body), validate)
			switch {
			case tt.wantJSONError:
				if !errors.Is(err, httputil.ErrInvalidJSONBody) {
					t.Fatalf("error = %v, want ErrInvalidJSONBody", err)
				}
			case tt.wantField != "":
				var validationErrors validator.ValidationErrors
				if !errors.As(err, &validationErrors) {
					t.Fatalf("error = %T(%v), want validator.ValidationErrors", err, err)
				}
				if len(validationErrors) != 1 {
					t.Fatalf("validation errors = %v, want exactly one", validationErrors)
				}
				if validationErrors[0].Field() != tt.wantField || validationErrors[0].Tag() != tt.wantTag {
					t.Fatalf("validation error = field %q tag %q, want field %q tag %q", validationErrors[0].Field(), validationErrors[0].Tag(), tt.wantField, tt.wantTag)
				}
			case err != nil:
				t.Fatalf("DecodeAndValidateJSONBytes() error = %v", err)
			default:
				if got != tt.want {
					t.Fatalf("DecodeAndValidateJSONBytes() = %#v, want %#v", got, tt.want)
				}
			}
		})
	}
}

func TestDecodeAndValidateJSONRejectsOversizedBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	validate, err := httputil.NewValidator()
	if err != nil {
		t.Fatalf("NewValidator() error = %v", err)
	}

	request := httptest.NewRequest("POST", "/", strings.NewReader(strings.Repeat(" ", httputil.MaxJSONBodySize+1)))
	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Request = request

	_, err = httputil.DecodeAndValidateJSON[validationRequest](context, validate)
	if !errors.Is(err, httputil.ErrJSONBodyTooLarge) {
		t.Fatalf("error = %v, want ErrJSONBodyTooLarge", err)
	}
}
