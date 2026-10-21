package calculator

import "github.com/cockroachdb/apd/v3"

type subtract struct{}

func (subtract) Name() string { return "subtract" }
func (subtract) Arity() int   { return 2 }

func (subtract) Apply(ops []*apd.Decimal) (*apd.Decimal, error) {
	r := new(apd.Decimal)
	cond, err := decimalContext.Sub(r, ops[0], ops[1])
	return finish(r, cond, err)
}
