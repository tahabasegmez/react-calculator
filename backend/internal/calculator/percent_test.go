package calculator

import "testing"

func TestPercent(t *testing.T) {
	runOpCases(t, percent{}, []opCase{
		{name: "divides by 100", operands: []string{"50"}, want: "0.5"},
		{name: "keeps the sign", operands: []string{"-10"}, want: "-0.1"},
		{name: "underflows to zero", operands: []string{"1e-9999"}, want: "0"},
	})
}
