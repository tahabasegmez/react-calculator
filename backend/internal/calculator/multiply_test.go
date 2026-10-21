package calculator

import "testing"

func TestMultiply(t *testing.T) {
	runOpCases(t, multiply{}, []opCase{
		{name: "multiplies with sign", operands: []string{"1.5", "-2"}, want: "-3"},
		{name: "negative times zero gives zero", operands: []string{"-5", "0"}, want: "0"},
		{name: "returns OVERFLOW above the exponent range", operands: []string{"1e5000", "1e5000"}, wantCode: CodeOverflow},
		{name: "underflows to zero", operands: []string{"1e-5000", "1e-5000"}, want: "0"},
		{name: "subnormal result underflows to zero", operands: []string{"1.5e-5000", "1e-5000"}, want: "0"},
	})
}
