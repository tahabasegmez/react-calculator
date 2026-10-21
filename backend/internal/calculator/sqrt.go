package calculator

import "github.com/cockroachdb/apd/v3"

type sqrt struct{}

func (sqrt) Name() string { return "sqrt" }
func (sqrt) Arity() int   { return 1 }

func (sqrt) Apply(ops []*apd.Decimal) (*apd.Decimal, error) {
	if ops[0].Sign() < 0 {
		return nil, newError(CodeInvalidDomain, "Invalid input")
	}
	r := new(apd.Decimal)
	cond, err := decimalContext.Sqrt(r, ops[0])
	return finish(r, cond, err)
}
