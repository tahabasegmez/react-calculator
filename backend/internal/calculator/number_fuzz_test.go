package calculator

import "testing"

func FuzzParseNumber(f *testing.F) {
	for _, seed := range []string{
		"12", "-0.5", "12.", ".5", "-0.", "1.2e+20", "1E-5", "", " 5", "+5", "abc",
		"NaN", "Inf", "1,000", "1e20000", "1e-20000", "9.9999999999999999999999999999999999e9999",
	} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, s string) {
		d, err := ParseNumber(s)
		if err != nil {
			if codeOf(err) != CodeInvalidNumber {
				t.Fatalf("%q: got error %v, want INVALID_NUMBER", s, err)
			}
			return
		}
		// Every accepted number formats to output that parses back to the same value.
		formatted := FormatNumber(d)
		again, err := ParseNumber(formatted)
		if err != nil {
			t.Fatalf("%q formatted as %q, which does not parse: %v", s, formatted, err)
		}
		if FormatNumber(again) != formatted {
			t.Fatalf("%q formatted as %q, then as %q", s, formatted, FormatNumber(again))
		}
	})
}
