package calculator

import "testing"

func TestSquare(t *testing.T) {
	runOpCases(t, square{}, []opCase{
		{name: "squares a value", operands: []string{"5"}, want: "25"},
		{name: "square of a negative is positive", operands: []string{"-3"}, want: "9"},
		{name: "returns OVERFLOW above the exponent range", operands: []string{"1e5000"}, wantCode: CodeOverflow},
		{name: "underflows to zero", operands: []string{"1e-5000"}, want: "0"},
	})
}
