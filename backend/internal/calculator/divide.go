package calculator

import "github.com/cockroachdb/apd/v3"

type divide struct{}

func (divide) Name() string { return "divide" }
func (divide) Arity() int   { return 2 }

func (divide) Apply(ops []*apd.Decimal) (*apd.Decimal, error) {
	if ops[1].IsZero() {
		if ops[0].IsZero() {
			return nil, newError(CodeUndefinedResult, "Result is undefined")
		}
		return nil, newError(CodeDivisionByZero, "Cannot divide by zero")
	}
	r := new(apd.Decimal)
	cond, err := decimalContext.Quo(r, ops[0], ops[1])
	return finish(r, cond, err)
}
