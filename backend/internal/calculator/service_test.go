package calculator

import "testing"

func TestDefaultRegistryHasAllOperations(t *testing.T) {
	want := map[string]int{
		"add": 2, "subtract": 2, "multiply": 2, "divide": 2,
		"percent": 1, "percent_of": 2, "sqrt": 1, "square": 1, "reciprocal": 1,
	}
	r := NewDefaultRegistry()
	for name, arity := range want {
		op, ok := r.Get(name)
		if !ok {
			t.Fatalf("operation %q is not registered", name)
		}
		if op.Name() != name || op.Arity() != arity {
			t.Fatalf("got %q with arity %d, want %q with arity %d", op.Name(), op.Arity(), name, arity)
		}
	}
}

func TestServiceCalculate(t *testing.T) {
	cases := []struct {
		name      string
		operation string
		operands  []string
		want      string
		wantCode  Code
	}{
		{name: "performs a binary operation", operation: "add", operands: []string{"0.1", "0.2"}, want: "0.3"},
		{name: "performs a unary operation", operation: "sqrt", operands: []string{"9"}, want: "3"},
		{name: "returns UNSUPPORTED_OPERATION for an unknown name", operation: "power", operands: []string{"2", "3"}, wantCode: CodeUnsupportedOperation},
		{name: "returns INVALID_OPERAND_COUNT for too few operands", operation: "add", operands: []string{"1"}, wantCode: CodeInvalidOperandCount},
		{name: "returns INVALID_OPERAND_COUNT for too many operands", operation: "sqrt", operands: []string{"1", "2"}, wantCode: CodeInvalidOperandCount},
		{name: "returns INVALID_NUMBER for a malformed operand", operation: "add", operands: []string{"1", "abc"}, wantCode: CodeInvalidNumber},
		{name: "returns calculation errors", operation: "divide", operands: []string{"1", "0"}, wantCode: CodeDivisionByZero},
	}
	s := NewService(NewDefaultRegistry())
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := s.Calculate(tc.operation, tc.operands)
			if tc.wantCode != "" {
				if code := codeOf(err); code != tc.wantCode {
					t.Fatalf("got code %q (err %v), want %q", code, err, tc.wantCode)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
}
