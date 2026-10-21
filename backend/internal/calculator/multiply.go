package calculator

import "github.com/cockroachdb/apd/v3"

type multiply struct{}

func (multiply) Name() string { return "multiply" }
func (multiply) Arity() int   { return 2 }

func (multiply) Apply(ops []*apd.Decimal) (*apd.Decimal, error) {
	r := new(apd.Decimal)
	cond, err := decimalContext.Mul(r, ops[0], ops[1])
	return finish(r, cond, err)
}
