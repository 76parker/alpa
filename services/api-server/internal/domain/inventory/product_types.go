package inventory

import "errors"

// ProductCriticality represents the criticality of a product.
type ProductCriticality string

var (
	ErrInvalidCriticality = errors.New("invalid criticality")
	ErrInvalidProductName = errors.New("invalid product name")
	ErrInvalidProductCode = errors.New("invalid product code")
)

const (
	CriticalityMissionCritical     ProductCriticality = "mission-critical"
	CriticalityBusinessCritical    ProductCriticality = "business-critical"
	CriticalityBusinessOperational ProductCriticality = "business-operational"
	CriticalityOfficeProductivity  ProductCriticality = "office-productivity"
)

func isValidCriticality(s ProductCriticality) bool {
	switch s {
	case CriticalityMissionCritical,
		CriticalityBusinessCritical,
		CriticalityBusinessOperational,
		CriticalityOfficeProductivity:
		return true
	default:
		return false
	}
}
