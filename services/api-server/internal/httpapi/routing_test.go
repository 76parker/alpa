package httpapi

import (
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/76parker/alpa/internal/observability/logger"
	"github.com/76parker/alpa/internal/webui"
)

func TestUIRouting(t *testing.T) {
	// UI routes use the normal logging middleware; API and documentation keep priority.
	ui, err := webui.New(fstest.MapFS{"index.html": {Data: []byte("<title>Alpa</title>")}}, false)
	if err != nil {
		t.Fatal(err)
	}
	log := &requestLogger{}
	router := newRouter(log, Handlers{UI: ui})
	for _, test := range []struct {
		path   string
		status int
		body   string
	}{
		{"/products/PAY", 200, "<title>Alpa"},
		{"/docs", 200, "Swagger"},
		{"/docs/openapi.json", 200, "openapi"},
		{"/v1/unknown", 404, ""},
		{"/docs/unknown", 404, ""},
		{"/api/inventory/workspaces", 404, ""},
	} {
		t.Run(test.path, func(t *testing.T) {
			req := httptest.NewRequest("GET", test.path, nil)
			req.Header.Set("Accept", "text/html")
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)
			if rec.Code != test.status || !strings.Contains(rec.Body.String(), test.body) {
				t.Fatalf("response = %d %s", rec.Code, rec.Body.String())
			}
			if test.path == "/products/PAY" && log.handler != "webui" {
				t.Fatalf("logged handler = %q", log.handler)
			}
		})
	}
}

type requestLogger struct{ handler string }

func (l *requestLogger) Info(_ string, fields ...any) {
	for i := 0; i+1 < len(fields); i += 2 {
		if fields[i] == "handler" {
			l.handler, _ = fields[i+1].(string)
		}
	}
}
func (l *requestLogger) Warn(string, ...any)            {}
func (l *requestLogger) Error(string, ...any)           {}
func (l *requestLogger) Debug(string, ...any)           {}
func (l *requestLogger) With(...any) logger.Logger      { return l }
func (l *requestLogger) WithGroup(string) logger.Logger { return l }
