package calculator

import "testing"

func TestPercentOf(t *testing.T) {
	runOpCases(t, percentOf{}, []opCase{
		{name: "takes a percentage of a value", operands: []string{"200", "10"}, want: "20"},
		{name: "percentage of itself", operands: []string{"200", "200"}, want: "400"},
		{name: "intermediate product above the range does not overflow", operands: []string{"1e9999", "1e2"}, want: "1e+9999"},
		{name: "returns OVERFLOW above the exponent range", operands: []string{"9e9999", "1e3"}, wantCode: CodeOverflow},
	})
}
