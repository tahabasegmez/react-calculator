package calculator

import "testing"

func TestAdd(t *testing.T) {
	runOpCases(t, add{}, []opCase{
		{name: "adds decimals exactly", operands: []string{"0.1", "0.2"}, want: "0.3"},
		{name: "opposites give zero", operands: []string{"-5", "5"}, want: "0"},
		{name: "rounds half away from zero at 34 digits", operands: []string{"1e33", "0.5"}, want: "1000000000000000000000000000000001"},
		{name: "returns OVERFLOW above the exponent range", operands: []string{"9e9999", "9e9999"}, wantCode: CodeOverflow},
	})
}
