package calculator

import "testing"

func TestReciprocal(t *testing.T) {
	runOpCases(t, reciprocal{}, []opCase{
		{name: "exact reciprocal", operands: []string{"4"}, want: "0.25"},
		{name: "rounds to 34 digits", operands: []string{"3"}, want: "0.3333333333333333333333333333333333"},
		{name: "smallest operand stays in range", operands: []string{"1e-9999"}, want: "1e+9999"},
		{name: "returns DIVISION_BY_ZERO for zero", operands: []string{"0"}, wantCode: CodeDivisionByZero},
	})
}
