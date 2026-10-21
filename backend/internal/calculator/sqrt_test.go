package calculator

import "testing"

func TestSqrt(t *testing.T) {
	runOpCases(t, sqrt{}, []opCase{
		{name: "exact root", operands: []string{"9"}, want: "3"},
		{name: "rounds to 34 digits", operands: []string{"2"}, want: "1.414213562373095048801688724209698"},
		{name: "zero", operands: []string{"0"}, want: "0"},
		{name: "negative zero", operands: []string{"-0"}, want: "0"},
		{name: "returns INVALID_DOMAIN for a negative number", operands: []string{"-4"}, wantCode: CodeInvalidDomain},
	})
}
