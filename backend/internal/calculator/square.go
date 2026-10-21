package calculator

import "github.com/cockroachdb/apd/v3"

type square struct{}

func (square) Name() string { return "square" }
func (square) Arity() int   { return 1 }

func (square) Apply(ops []*apd.Decimal) (*apd.Decimal, error) {
	r := new(apd.Decimal)
	cond, err := decimalContext.Mul(r, ops[0], ops[0])
	return finish(r, cond, err)
}
