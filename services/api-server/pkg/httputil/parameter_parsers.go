package httputil

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
)

var ErrInvalidID = errors.New("invalid id: id cannot be zero or negative")

func ParseID(c *gin.Context, parameter string) (int64, error) {
	id, err := strconv.ParseInt(c.Param(parameter), 10, 64)
	if err != nil || id <= 0 {
		return 0, ErrInvalidID
	}

	return id, nil
}
