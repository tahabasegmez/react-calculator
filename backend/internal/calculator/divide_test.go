package calculator

import "testing"

func TestDivide(t *testing.T) {
	runOpCases(t, divide{}, []opCase{
		{name: "rounds to 34 digits", operands: []string{"1", "3"}, want: "0.3333333333333333333333333333333333"},
		{name: "rounds half away from zero", operands: []string{"2", "3"}, want: "0.6666666666666666666666666666666667"},
		{name: "rounds negative half away from zero", operands: []string{"-2", "3"}, want: "-0.6666666666666666666666666666666667"},
		{name: "returns DIVISION_BY_ZERO when divisor is zero", operands: []string{"1", "0"}, wantCode: CodeDivisionByZero},
		{name: "returns UNDEFINED_RESULT for zero divided by zero", operands: []string{"0", "0"}, wantCode: CodeUndefinedResult},
		{name: "returns OVERFLOW above the exponent range", operands: []string{"1e9999", "0.1"}, wantCode: CodeOverflow},
		{name: "underflows to zero", operands: []string{"1e-9999", "10"}, want: "0"},
	})
}
