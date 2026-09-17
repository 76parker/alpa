package inventory

import "errors"

var (
	ErrNegativeID = errors.New("id must be positive")
)
