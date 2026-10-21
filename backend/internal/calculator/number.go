package calculator

import (
	"regexp"
	"strconv"
	"strings"

	"github.com/cockroachdb/apd/v3"
)

const maxNumberLength = 100

var numberPattern = regexp.MustCompile(`^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$`)

// ParseNumber parses an operand and rounds it to 34 significant digits.
func ParseNumber(s string) (*apd.Decimal, error) {
	invalid := newError(CodeInvalidNumber, "Not a valid number: "+strconv.Quote(s))
	if len(s) > maxNumberLength || !numberPattern.MatchString(s) {
		return nil, invalid
	}
	d, _, err := apd.NewFromString(s)
	if err != nil || outOfRange(d) {
		return nil, invalid
	}
	if _, err := decimalContext.Round(d, d); err != nil || outOfRange(d) {
		return nil, invalid
	}
	return d, nil
}

func outOfRange(d *apd.Decimal) bool {
	if d.Form != apd.Finite {
		return true
	}
	adj := adjustedExponent(d)
	return adj > maxExponent || adj < minExponent
}

// FormatNumber writes d without trailing zeros, in plain notation for adjusted
// exponents from -20 to 33 and in scientific notation otherwise.
func FormatNumber(d *apd.Decimal) string {
	if d.IsZero() {
		return "0"
	}
	r := new(apd.Decimal)
	r.Reduce(d)
	adj := adjustedExponent(r)
	if adj >= -20 && adj <= 33 {
		return r.Text('f')
	}

	var b strings.Builder
	if r.Negative {
		b.WriteByte('-')
	}
	digits := r.Coeff.String()
	b.WriteString(digits[:1])
	if len(digits) > 1 {
		b.WriteByte('.')
		b.WriteString(digits[1:])
	}
	b.WriteByte('e')
	if adj >= 0 {
		b.WriteByte('+')
	}
	b.WriteString(strconv.FormatInt(adj, 10))
	return b.String()
}
