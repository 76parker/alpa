package webui

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"
)

func TestServeSPA(t *testing.T) {
	// Navigation gets the SPA; resource and service requests must retain their own semantics.
	assets := fstest.MapFS{
		"index.html":                {Data: []byte("<!doctype html><title>Alpa</title>")},
		"assets/index-aB12_cD3.js":  {Data: []byte("console.log('alpa')")},
		"assets/index-aB12_cD3.css": {Data: []byte("body { color: red }")},
		"logo.svg":                  {Data: []byte("<svg></svg>")},
		"plain.js":                  {Data: []byte("export {}")},
		".env":                      {Data: []byte("secret")},
		"assets/.hidden/key":        {Data: []byte("secret")},
	}
	handler, err := New(assets, false)
	if err != nil {
		t.Fatal(err)
	}
	for _, test := range []struct {
		name, method, path, accept string
		status                     int
		contentType, cache         string
	}{
		{"root", "GET", "/", "text/html", 200, "text/html", "no-cache"},
		{"direct product", "GET", "/products/PAY", "text/html", 200, "text/html", "no-cache"},
		{"unknown page", "GET", "/future-page", "text/html,application/xhtml+xml", 200, "text/html", "no-cache"},
		{"navigation head", "HEAD", "/products/PAY/", "text/html", 200, "text/html", "no-cache"},
		{"index head", "HEAD", "/index.html", "", 200, "text/html", "no-cache"},
		{"hashed js", "GET", "/assets/index-aB12_cD3.js", "*/*", 200, "javascript", "public, max-age=31536000, immutable"},
		{"hashed css", "GET", "/assets/index-aB12_cD3.css", "text/css", 200, "text/css", "public, max-age=31536000, immutable"},
		{"unhashed", "GET", "/plain.js", "*/*", 200, "javascript", "no-cache"},
		{"svg", "GET", "/logo.svg", "image/*", 200, "image/svg+xml", "no-cache"},
		{"missing asset", "GET", "/assets/missing.js", "text/html", 404, "", ""},
		{"extensionless asset", "GET", "/assets/missing", "text/html", 404, "", ""},
		{"directory", "GET", "/assets/", "text/html", 404, "", ""},
		{"hidden file", "GET", "/.env", "text/html", 404, "", ""},
		{"hidden directory", "GET", "/assets/.hidden/key", "text/html", 404, "", ""},
		{"traversal", "GET", "/assets/%2e%2e/index.html", "text/html", 404, "", ""},
		{"backslash", "GET", "/assets%5cindex.html", "text/html", 404, "", ""},
		{"api", "GET", "/v1/missing", "text/html", 404, "", ""},
		{"api root", "GET", "/v1", "text/html", 404, "", ""},
		{"docs", "GET", "/docs/missing", "text/html", 404, "", ""},
		{"removed proxy", "GET", "/api/inventory/workspaces", "text/html", 404, "", ""},
		{"next", "GET", "/_next/missing", "text/html", 404, "", ""},
		{"vite", "GET", "/@vite/client", "text/html", 404, "", ""},
		{"vinext", "GET", "/__vinext/missing", "text/html", 404, "", ""},
		{"json", "GET", "/products/PAY", "application/json", 404, "", ""},
		{"wildcard", "GET", "/products/PAY", "*/*", 404, "", ""},
		{"html excluded", "GET", "/products/PAY", "text/html;q=0,*/*", 404, "", ""},
		{"post", "POST", "/products/PAY", "text/html", 405, "", ""},
		{"options", "OPTIONS", "/", "text/html", 405, "", ""},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(test.method, test.path, nil)
			req.Header.Set("Accept", test.accept)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code != test.status {
				t.Fatalf("status = %d, want %d: %s", rec.Code, test.status, rec.Body.String())
			}
			if test.contentType != "" && !strings.Contains(rec.Header().Get("Content-Type"), test.contentType) {
				t.Fatalf("Content-Type = %q", rec.Header().Get("Content-Type"))
			}
			if rec.Header().Get("Cache-Control") != test.cache {
				t.Fatalf("Cache-Control = %q, want %q", rec.Header().Get("Cache-Control"), test.cache)
			}
			if test.status != 200 && strings.Contains(rec.Body.String(), "<title>Alpa") {
				t.Fatal("error received SPA HTML")
			}
			if test.method == "HEAD" && rec.Body.Len() != 0 {
				t.Fatal("HEAD returned a body")
			}
			if test.status == 405 && rec.Header().Get("Allow") != "GET, HEAD" {
				t.Fatal("missing Allow header")
			}
		})
	}
}

func TestAssetSources(t *testing.T) {
	// Invalid startup assets must fail, and local rebuilds must be visible to the same handler.
	for name, assets := range map[string]fs.FS{
		"nil": nil, "missing index": fstest.MapFS{},
		"index directory": fstest.MapFS{"index.html": {Mode: fs.ModeDir}},
	} {
		t.Run(name, func(t *testing.T) {
			if _, err := New(assets, false); err == nil {
				t.Fatal("expected invalid UI error")
			}
		})
	}
	dir := t.TempDir()
	if _, err := Load(filepath.Join(dir, "missing")); err == nil {
		t.Fatal("expected missing directory error")
	}
	if _, err := Load(dir); err == nil {
		t.Fatal("expected missing index error")
	}
	index := filepath.Join(dir, "index.html")
	if err := os.WriteFile(index, []byte("first build"), 0o600); err != nil {
		t.Fatal(err)
	}
	handler, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer handler.Close()
	for _, body := range []string{"first build", "rebuilt UI"} {
		if err := os.WriteFile(index, []byte(body), 0o600); err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest("GET", "/products/PAY", nil)
		req.Header.Set("Accept", "text/html")
		req.Header.Set("If-Modified-Since", "Wed, 01 Jan 2031 00:00:00 GMT")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != 200 || rec.Body.String() != body || rec.Header().Get("Cache-Control") != "no-store" {
			t.Fatalf("local response = %d %q %v", rec.Code, rec.Body.String(), rec.Header())
		}
	}
	outside := filepath.Join(t.TempDir(), "private.txt")
	if err := os.WriteFile(outside, []byte("private"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(outside, filepath.Join(dir, "escape.txt")); err != nil {
		t.Fatal(err)
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/escape.txt", nil))
	if rec.Code == 200 || strings.Contains(rec.Body.String(), "private") {
		t.Fatal("served a symlink outside the UI root")
	}
}
