package httpapi

import (
	"net/http"
	"time"

	"github.com/76parker/alpa/internal/httpapi/errmap"
	"github.com/76parker/alpa/internal/observability/logger"
	"github.com/gin-gonic/gin"
)

func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		err := c.Errors.Last()
		if err == nil || c.Writer.Written() {
			return
		}

		httpError, ok := errmap.Resolve(err.Err)
		if !ok {
			httpError = errmap.UnexpectedError
		}
		c.AbortWithStatusJSON(httpError.Status, httpError)
	}
}

func handlerName(operation string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("handler_name", operation)
		c.Next()
	}
}

func withLogging(log logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		startedAt := time.Now()
		c.Next()

		if shouldSkipRequestLogging(c) {
			return
		}

		fields := requestLogFields(c, startedAt)
		if err := c.Errors.Last(); err != nil {
			if c.Writer.Status() >= http.StatusBadRequest && c.Writer.Status() < http.StatusInternalServerError {
				log.Warn("request not executed", append(fields, "error", err.Err)...)
				return
			}
			log.Error("request failed via unexpected error", append(fields, "error", err.Err)...)
			return
		}
		log.Info("request completed", fields...)
	}
}

func shouldSkipRequestLogging(c *gin.Context) bool {
	switch c.GetString("handler_name") {
	case "documentation", "webui":
		return true
	default:
		return false
	}
}

func requestLogFields(c *gin.Context, startedAt time.Time) []any {
	handlerName := c.GetString("handler_name")
	if handlerName == "" {
		handlerName = "unknown"
	}
	return []any{
		"handler", handlerName,
		"method", c.Request.Method,
		"uri", c.Request.URL.RequestURI(),
		"status", c.Writer.Status(),
		"response_size", c.Writer.Size(),
		"duration", time.Since(startedAt),
	}
}
