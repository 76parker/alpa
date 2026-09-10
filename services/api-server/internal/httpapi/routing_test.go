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
	ui, err := webui.New(fstest.MapFS{
		"index.html":             {Data: []byte("<title>Alpa</title>")},
		"assets/app-12345678.js": {Data: []byte("console.log('alpa')")},
	}, false)
	if err != nil {
		t.Fatal(err)
	}
	log := &requestLogger{}
	router := newRouter(log, Handlers{UI: ui})
	for _, test := range []struct {
		path   string
		status int
		body   string
		logged bool
	}{
		{"/products/PAY", 200, "<title>Alpa", false},
		{"/assets/app-12345678.js", 200, "console.log", false},
		{"/docs", 200, "Swagger", false},
		{"/docs/openapi.json", 200, "openapi", false},
		{"/v1/unknown", 404, "", true},
		{"/docs/unknown", 404, "", true},
		{"/api/inventory/workspaces", 404, "", true},
	} {
		t.Run(test.path, func(t *testing.T) {
			beforeLogs := log.infoCount
			req := httptest.NewRequest("GET", test.path, nil)
			req.Header.Set("Accept", "text/html")
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)
			if rec.Code != test.status || !strings.Contains(rec.Body.String(), test.body) {
				t.Fatalf("response = %d %s", rec.Code, rec.Body.String())
			}
			if got := log.infoCount - beforeLogs; (got > 0) != test.logged {
				t.Fatalf("request log count = %d, logged = %t", got, test.logged)
			}
		})
	}
}

type requestLogger struct {
	handler   string
	infoCount int
}

func (l *requestLogger) Info(_ string, fields ...any) {
	l.infoCount++
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
