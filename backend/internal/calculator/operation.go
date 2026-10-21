package calculator

import "github.com/cockroachdb/apd/v3"

// Operation is one calculator operation with a fixed number of operands.
type Operation interface {
	Name() string
	Arity() int
	Apply(operands []*apd.Decimal) (*apd.Decimal, error)
}
