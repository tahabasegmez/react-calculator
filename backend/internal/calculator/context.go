package calculator

import "github.com/cockroachdb/apd/v3"

const (
	precision   = 34
	maxExponent = 9999
	minExponent = -9999
)

// decimalContext is shared; apd contexts are safe for concurrent use.
var decimalContext = &apd.Context{
	Precision:   precision,
	Rounding:    apd.RoundHalfUp,
	MaxExponent: maxExponent,
	MinExponent: minExponent,
}

// wideContext has the same precision but no practical exponent limit, for intermediate results.
var wideContext = &apd.Context{
	Precision:   precision,
	Rounding:    apd.RoundHalfUp,
	MaxExponent: apd.MaxExponent,
	MinExponent: apd.MinExponent,
}

// adjustedExponent is the exponent of the value written as d.ddd × 10^n.
func adjustedExponent(d *apd.Decimal) int64 {
	return d.NumDigits() + int64(d.Exponent) - 1
}

// finish turns the outcome of an apd call into a result: overflow is an error,
// and values below the exponent range become zero.
func finish(d *apd.Decimal, cond apd.Condition, err error) (*apd.Decimal, error) {
	if err != nil {
		return nil, err
	}
	if cond&apd.Overflow != 0 {
		return nil, newError(CodeOverflow, "Overflow")
	}
	if d.IsZero() || adjustedExponent(d) < minExponent {
		return new(apd.Decimal), nil
	}
	return d, nil
}
