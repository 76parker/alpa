package httputil

import (
	"github.com/gin-gonic/gin"
)

const MaxJSONBodySize = 1024 * 1024

func FailRequest(c *gin.Context, err error) {
	c.Error(err)
	c.Abort()
}
