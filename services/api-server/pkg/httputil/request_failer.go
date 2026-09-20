package httputil

import (
	"github.com/gin-gonic/gin"
)

// MaxJSONBodySize permits two 2 MiB UTF-8 client fields plus JSON framing.
const MaxJSONBodySize = 6 * 1024 * 1024

func FailRequest(c *gin.Context, err error) {
	_ = c.Error(err)
	c.Abort()
}
