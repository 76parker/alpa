package inventory

import "errors"

var (
	ErrNegativeID                 = errors.New("id must be positive")
	ErrConsumerAPIHasSameProvider = errors.New("component cannot consume its own api")
	ErrConsumerAPIAlreadyExists   = errors.New("consumer api link already exists")
)
