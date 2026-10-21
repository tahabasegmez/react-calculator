package calculator

import "github.com/cockroachdb/apd/v3"

var one = apd.New(1, 0)

type reciprocal struct{}

func (reciprocal) Name() string { return "reciprocal" }
func (reciprocal) Arity() int   { return 1 }

func (reciprocal) Apply(ops []*apd.Decimal) (*apd.Decimal, error) {
	if ops[0].IsZero() {
		return nil, newError(CodeDivisionByZero, "Cannot divide by zero")
	}
	r := new(apd.Decimal)
	cond, err := decimalContext.Quo(r, one, ops[0])
	return finish(r, cond, err)
}
