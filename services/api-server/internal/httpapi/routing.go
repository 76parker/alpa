package httpapi

import (
	"net/http"

	"github.com/76parker/alpa/docs"
	"github.com/76parker/alpa/internal/httpapi/component"
	"github.com/76parker/alpa/internal/httpapi/product"
	"github.com/76parker/alpa/internal/httpapi/workspace"
	"github.com/76parker/alpa/internal/observability/logger"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files/v2"
)

type Handlers struct {
	Workspace *workspace.Handler
	Product   *product.Handler
	Component *component.Handler
}

func newRouter(log logger.Logger, handlers Handlers) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(withLogging(log))
	initSwaggerRoutes(router)
	router.Use(ErrorHandler())

	v1 := router.Group("/v1")
	initWorkspaceRoutes(v1, &handlers)
	initProductRoutes(v1, &handlers)
	initComponentRoutes(v1, &handlers)
	return router
}

func serveSwaggerUI(c *gin.Context) {
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(docs.SwaggerUIHTML))
}

func serveOpenAPIYAML(c *gin.Context) {
	c.Data(http.StatusOK, "application/yaml; charset=utf-8", docs.OpenAPIYAML)
}

func serveOpenAPIJSON(c *gin.Context) {
	c.Data(http.StatusOK, "application/json; charset=utf-8", docs.OpenAPIJSON)
}

func initSwaggerRoutes(router *gin.Engine) {
	router.GET("/docs", handlerName("documentation"), serveSwaggerUI)
	router.GET("/docs/openapi.yaml", handlerName("documentation"), serveOpenAPIYAML)
	router.GET("/docs/openapi.json", handlerName("documentation"), serveOpenAPIJSON)
	router.GET(
		"/docs/swagger-ui/*filepath",
		handlerName("documentation"),
		gin.WrapH(http.StripPrefix("/docs/swagger-ui/", http.FileServer(http.FS(swaggerFiles.FS)))),
	)
}

func initComponentRoutes(group *gin.RouterGroup, handlers *Handlers) {
	group.POST("/components", handlerName("component.create"), handlers.Component.Create)
	group.POST("/components/:id/consumer-apis", handlerName("component.consumer_api.create"), handlers.Component.AddConsumerAPI)
	group.DELETE("/components/:id/consumer-apis/:api_id", handlerName("component.consumer_api.delete"), handlers.Component.RemoveConsumerAPI)
	group.GET("/components/:id", handlerName("component.get"), handlers.Component.Get)
	group.DELETE("/components/:id", handlerName("component.delete"), handlers.Component.Delete)
	group.GET("/products/:product_id/components", handlerName("component.list"), handlers.Component.List)
}

func initProductRoutes(group *gin.RouterGroup, handlers *Handlers) {
	group.POST("/workspaces/:workspace_id/products", handlerName("product.create"), handlers.Product.Create)
	group.GET("/workspaces/:workspace_id/products", handlerName("product.list"), handlers.Product.List)
	group.GET("/products/:product_id", handlerName("product.get"), handlers.Product.Get)
	group.DELETE("/products/:product_id", handlerName("product.delete"), handlers.Product.Delete)
}

func initWorkspaceRoutes(group *gin.RouterGroup, handlers *Handlers) {
	group.POST("/workspaces", handlerName("workspace.create"), handlers.Workspace.Create)
	group.GET("/workspaces", handlerName("workspace.list"), handlers.Workspace.List)
	group.GET("/workspaces/:workspace_id", handlerName("workspace.get"), handlers.Workspace.Get)
}
