package calculator

import "github.com/cockroachdb/apd/v3"

var hundred = apd.New(100, 0)

type percent struct{}

func (percent) Name() string { return "percent" }
func (percent) Arity() int   { return 1 }

func (percent) Apply(ops []*apd.Decimal) (*apd.Decimal, error) {
	r := new(apd.Decimal)
	cond, err := decimalContext.Quo(r, ops[0], hundred)
	return finish(r, cond, err)
}
