//go:build embedui

package webui

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestEmbeddedUI(t *testing.T) {
	// Exercise the production embed source, not a substitute filesystem.
	handler, err := Load("")
	if err != nil {
		t.Fatal(err)
	}
	defer handler.Close()
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "<html") {
		t.Fatalf("embedded index = %d %q", rec.Code, rec.Body.String())
	}
}
