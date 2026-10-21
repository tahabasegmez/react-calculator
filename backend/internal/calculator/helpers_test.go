package calculator

import (
	"errors"
	"testing"

	"github.com/cockroachdb/apd/v3"
)

type opCase struct {
	name     string
	operands []string
	want     string
	wantCode Code
}

// runOpCases applies op to each case and checks the formatted result or the error code.
func runOpCases(t *testing.T, op Operation, cases []opCase) {
	t.Helper()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := apply(t, op, tc.operands)
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

func apply(t *testing.T, op Operation, operands []string) (string, error) {
	t.Helper()
	ops := make([]*apd.Decimal, len(operands))
	for i, s := range operands {
		d, err := ParseNumber(s)
		if err != nil {
			t.Fatalf("operand %q: %v", s, err)
		}
		ops[i] = d
	}
	d, err := op.Apply(ops)
	if err != nil {
		return "", err
	}
	return FormatNumber(d), nil
}

func codeOf(err error) Code {
	var calcErr *Error
	if errors.As(err, &calcErr) {
		return calcErr.Code
	}
	return ""
}
