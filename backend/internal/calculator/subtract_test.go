package calculator

import "testing"

func TestSubtract(t *testing.T) {
	runOpCases(t, subtract{}, []opCase{
		{name: "subtracts decimals exactly", operands: []string{"0.3", "0.1"}, want: "0.2"},
		{name: "equal values give zero", operands: []string{"5", "5"}, want: "0"},
		{name: "result can be negative", operands: []string{"2", "5"}, want: "-3"},
		{name: "returns OVERFLOW above the exponent range", operands: []string{"-9e9999", "9e9999"}, wantCode: CodeOverflow},
	})
}
