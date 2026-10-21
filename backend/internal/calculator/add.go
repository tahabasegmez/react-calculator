package calculator

import "github.com/cockroachdb/apd/v3"

type add struct{}

func (add) Name() string { return "add" }
func (add) Arity() int   { return 2 }

func (add) Apply(ops []*apd.Decimal) (*apd.Decimal, error) {
	r := new(apd.Decimal)
	cond, err := decimalContext.Add(r, ops[0], ops[1])
	return finish(r, cond, err)
}
