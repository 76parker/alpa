// Package webui serves the SPA from embedded resources or a local build directory.
package webui

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mime"
	"net/http"
	"os"
	"path"
	"regexp"
	"strconv"
	"strings"
)

var hashedAsset = regexp.MustCompile(`^assets/.+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$`)

// Handler serves only public files and HTML navigation requests.
// The supplied filesystem must contain trusted, built frontend assets.
type Handler struct {
	assets fs.FS
	local  bool
	closer io.Closer
}

// New validates the entry point before the handler can be registered.
func New(assets fs.FS, local bool) (*Handler, error) {
	if assets == nil {
		return nil, errors.New("UI assets are unavailable")
	}
	entry, err := fs.Stat(assets, "index.html")
	if err != nil {
		return nil, fmt.Errorf("stat UI index.html (build the frontend first): %w", err)
	}
	if entry.IsDir() {
		return nil, errors.New("UI index.html is a directory")
	}
	return &Handler{assets: assets, local: local}, nil
}

// Load selects embedded assets when directory is empty. Local paths are relative
// to the process working directory and confined to that directory by os.Root.
func Load(directory string) (*Handler, error) {
	if directory == "" {
		assets, err := embeddedAssets()
		if err != nil {
			return nil, err
		}
		return New(assets, false)
	}
	root, err := os.OpenRoot(directory)
	if err != nil {
		return nil, fmt.Errorf("open UI assets directory %q: %w", directory, err)
	}
	handler, err := New(root.FS(), true)
	if err != nil {
		root.Close()
		return nil, fmt.Errorf("UI assets directory %q: %w", directory, err)
	}
	handler.closer = root
	return handler, nil
}

// Close releases the local directory handle after HTTP requests have stopped.
func (h *Handler) Close() error {
	if h.closer != nil {
		return h.closer.Close()
	}
	return nil
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimPrefix(r.URL.Path, "/")
	if !publicPath(name) {
		http.NotFound(w, r)
		return
	}
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	name = strings.TrimSuffix(name, "/")
	if name == "" {
		name = "index.html"
	}
	entry, err := fs.Stat(h.assets, name)
	if err != nil {
		if !errors.Is(err, fs.ErrNotExist) || !navigation(r, name) {
			http.NotFound(w, r)
			return
		}
		// Stat on every request so local rebuilds need no Go restart.
		name = "index.html"
		entry, err = fs.Stat(h.assets, name)
		if err != nil {
			http.Error(w, "UI assets unavailable", http.StatusServiceUnavailable)
			return
		}
	}
	if entry.IsDir() {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-cache")
	if h.local {
		w.Header().Set("Cache-Control", "no-store")
	} else if hashedAsset.MatchString(name) {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	}
	// ServeFileFS handles HEAD, ranges, and MIME types without reading each asset
	// into a new byte slice. Preserve ServeContent's former zero-modification-time
	// behavior so local Vite rebuilds cannot receive stale conditional responses.
	if strings.HasSuffix(r.URL.Path, "/index.html") || r.Header.Get("If-Modified-Since") != "" || r.Header.Get("If-Unmodified-Since") != "" || r.Header.Get("If-Range") != "" {
		r = r.Clone(r.Context())
		r.Header.Del("If-Modified-Since")
		r.Header.Del("If-Unmodified-Since")
		if r.Header.Get("If-Range") != "" {
			r.Header.Del("If-Range")
			r.Header.Del("Range")
		}
	}
	// ServeFileFS redirects paths ending in /index.html, unlike the existing
	// handler contract, so hide that URL detail from it.
	if strings.HasSuffix(r.URL.Path, "/index.html") {
		r.URL.Path = strings.TrimSuffix(r.URL.Path, "index.html")
	}
	http.ServeFileFS(w, r, h.assets, name)
}

func publicPath(name string) bool {
	if name == "" {
		return true
	}
	if strings.Contains(name, `\`) {
		return false
	}
	trimmed := strings.TrimSuffix(name, "/")
	if !fs.ValidPath(trimmed) {
		return false
	}
	for _, segment := range strings.Split(trimmed, "/") {
		if strings.HasPrefix(segment, ".") {
			return false
		}
	}
	first := strings.SplitN(trimmed, "/", 2)[0]
	if strings.HasPrefix(first, "_") || strings.HasPrefix(first, "@") {
		return false
	}
	switch first {
	case "v1", "docs", "api", "node_modules", "src":
		return false
	}
	return true
}

func navigation(r *http.Request, name string) bool {
	if path.Ext(strings.TrimSuffix(name, "/")) != "" || strings.SplitN(name, "/", 2)[0] == "assets" {
		return false
	}
	if dest := r.Header.Get("Sec-Fetch-Dest"); dest != "" && dest != "document" && dest != "iframe" {
		return false
	}
	for _, value := range strings.Split(r.Header.Get("Accept"), ",") {
		mediaType, params, err := mime.ParseMediaType(strings.TrimSpace(value))
		if err != nil || mediaType != "text/html" {
			continue
		}
		if quality, ok := params["q"]; ok {
			q, err := strconv.ParseFloat(quality, 64)
			if err != nil || q <= 0 || q > 1 {
				continue
			}
		}
		return true
	}
	return false
}
