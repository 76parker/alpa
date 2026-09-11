package inventory

import (
	"errors"
)

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

type Product struct {
	id           int64
	workspaceID  int64
	productCode  string
	owningTeamID *int64
	name         string
	criticality  ProductCriticality
	description  *string
}

func NewProduct(
	workspaceID int64,
	productCode string,
	owningTeamID *int64,
	name string,
	criticality ProductCriticality,
	description *string,
) (*Product, error) {
	if workspaceID <= 0 {
		return nil, ErrNegativeID
	}
	if owningTeamID != nil {
		if *owningTeamID <= 0 {
			return nil, ErrNegativeID
		}
	}
	if !isValidProductCode(productCode) {
		return nil, ErrInvalidProductCode
	}
	if name == "" {
		return nil, ErrInvalidProductName
	}
	if !isValidCriticality(criticality) {
		return nil, ErrInvalidCriticality
	}
	return &Product{
		workspaceID:  workspaceID,
		productCode:  productCode,
		owningTeamID: owningTeamID,
		name:         name,
		criticality:  criticality,
		description:  description,
	}, nil
}

func (p *Product) ID() int64 {
	return p.id
}

func (p *Product) WorkspaceID() int64 {
	return p.workspaceID
}

func (p *Product) ProductCode() string {
	return p.productCode
}

func (p *Product) OwningTeamID() *int64 {
	return p.owningTeamID
}

func (p *Product) Name() string {
	return p.name
}

func (p *Product) Criticality() ProductCriticality {
	return p.criticality
}

func (p *Product) Description() *string {
	return p.description
}

func RestoreProduct(
	id int64,
	workspaceID int64,
	productCode string,
	owningTeamID *int64,
	name string,
	criticality ProductCriticality,
	description *string,
) Product {
	return Product{
		id:           id,
		workspaceID:  workspaceID,
		productCode:  productCode,
		owningTeamID: owningTeamID,
		name:         name,
		criticality:  criticality,
		description:  description,
	}
}
