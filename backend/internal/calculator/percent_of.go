package calculator

import "github.com/cockroachdb/apd/v3"

type percentOf struct{}

func (percentOf) Name() string { return "percent_of" }
func (percentOf) Arity() int   { return 2 }

func (percentOf) Apply(ops []*apd.Decimal) (*apd.Decimal, error) {
	// The product may exceed the range even when the final result does not.
	product := new(apd.Decimal)
	if _, err := wideContext.Mul(product, ops[0], ops[1]); err != nil {
		return nil, err
	}
	r := new(apd.Decimal)
	cond, err := decimalContext.Quo(r, product, hundred)
	return finish(r, cond, err)
}
