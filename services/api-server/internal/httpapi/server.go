package httpapi

import (
	"context"
	"net/http"
	"time"

	"github.com/76parker/alpa/internal/observability/logger"
)

type Server struct {
	server *http.Server
}

type ServerConfig struct {
	Address           string
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	MaxHeaderBytes    int
}

func NewServer(
	cfg ServerConfig,
	log logger.Logger,
	handlers Handlers,
) *Server {
	return &Server{
		server: &http.Server{
			Addr:              cfg.Address,
			Handler:           newRouter(log, handlers),
			ReadHeaderTimeout: cfg.ReadHeaderTimeout,
			ReadTimeout:       cfg.ReadTimeout,
			WriteTimeout:      cfg.WriteTimeout,
			IdleTimeout:       cfg.IdleTimeout,
			MaxHeaderBytes:    cfg.MaxHeaderBytes,
		},
	}
}

func (s *Server) Handler() http.Handler {
	return s.server.Handler
}

func (s *Server) ListenAndServe() error {
	return s.server.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}
