package calculator

import (
	"strings"
	"testing"
)

func TestParseNumberAcceptsValidFormats(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"12", "12"},
		{"-0.5", "-0.5"},
		{"12.", "12"},
		{".5", "0.5"},
		{"-0.", "0"},
		{"1.2e+20", "120000000000000000000"},
		{"1E-5", "0.00001"},
		{"9.9e9999", "9.9e+9999"},
		{"1e-9999", "1e-9999"},
	}
	for _, tc := range cases {
		t.Run(tc.in, func(t *testing.T) {
			d, err := ParseNumber(tc.in)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got := FormatNumber(d); got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestParseNumberRejectsInvalidFormats(t *testing.T) {
	cases := []struct {
		name string
		in   string
	}{
		{"empty", ""},
		{"leading space", " 5"},
		{"plus sign", "+5"},
		{"letters", "abc"},
		{"NaN", "NaN"},
		{"Inf", "Inf"},
		{"Infinity", "Infinity"},
		{"thousands separator", "1,000"},
		{"exponent above range", "1e20000"},
		{"exponent below range", "1e-20000"},
		{"rounds above range", "9.9999999999999999999999999999999999e9999"},
		{"longer than 100 characters", strings.Repeat("1", 101)},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ParseNumber(tc.in)
			if code := codeOf(err); code != CodeInvalidNumber {
				t.Fatalf("got code %q (err %v), want %q", code, err, CodeInvalidNumber)
			}
		})
	}
}

func TestParseNumberAcceptsExactly100Characters(t *testing.T) {
	in := "0." + strings.Repeat("0", 97) + "1"
	if _, err := ParseNumber(in); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestParseNumberRoundsTo34DigitsHalfAwayFromZero(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"positive half", "1.2345678901234567890123456789012345", "1.234567890123456789012345678901235"},
		{"negative half", "-1.2345678901234567890123456789012345", "-1.234567890123456789012345678901235"},
		{"below half", "1.2345678901234567890123456789012344", "1.234567890123456789012345678901234"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			d, err := ParseNumber(tc.in)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got := FormatNumber(d); got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestFormatNumber(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"removes trailing zeros", "4.000", "4"},
		{"keeps integer zeros in plain notation", "100", "100"},
		{"negative zero becomes zero", "-0", "0"},
		{"zero with exponent", "0e5", "0"},
		{"negative fraction", "-0.25", "-0.25"},
		{"largest plain exponent", "1e33", "1" + strings.Repeat("0", 33)},
		{"scientific above plain range", "1e34", "1e+34"},
		{"smallest plain exponent", "1e-20", "0." + strings.Repeat("0", 19) + "1"},
		{"scientific below plain range", "1e-21", "1e-21"},
		{"scientific mantissa", "1.5e40", "1.5e+40"},
		{"scientific removes trailing zeros", "1.50e40", "1.5e+40"},
		{"negative scientific", "-2e-25", "-2e-25"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			d, err := ParseNumber(tc.in)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got := FormatNumber(d); got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
}
