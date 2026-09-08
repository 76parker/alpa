package httputil

import (
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
)

var (
	ErrInvalidOffset          = fmt.Errorf("pagination: invalid offset")
	ErrInvalidLimit           = fmt.Errorf("pagination: invalid limit")
	ErrInvalidPaginationRange = fmt.Errorf("pagination: invalid pagination range")
)

type PaginationResponse struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

type ListResponse[T any] struct {
	Data       []T                `json:"data"`
	Pagination PaginationResponse `json:"pagination"`
}

type Pagination struct {
	Limit  int
	Offset int
}

func ParsePagination(c *gin.Context) (Pagination, error) {
	limit := 0
	if rawLimit, exists := c.GetQuery("limit"); exists {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil {
			return Pagination{}, fmt.Errorf("%w: invalid limit", ErrInvalidLimit)
		}
		limit = parsedLimit
	}

	offset := 0
	if rawOffset, exists := c.GetQuery("offset"); exists {
		parsedOffset, err := strconv.Atoi(rawOffset)
		if err != nil {
			return Pagination{}, fmt.Errorf("%w: invalid offset", ErrInvalidOffset)
		}
		offset = parsedOffset
	}

	if limit == 0 {
		limit = 50
	}
	if limit < 1 || limit > 100 || offset < 0 {
		return Pagination{}, fmt.Errorf("%w: invalid pagination", ErrInvalidPaginationRange)
	}

	return Pagination{Limit: limit, Offset: offset}, nil
}
