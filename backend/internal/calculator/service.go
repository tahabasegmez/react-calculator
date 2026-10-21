package calculator

import (
	"fmt"

	"github.com/cockroachdb/apd/v3"
)

// Service performs one operation on string operands and returns a string result.
type Service struct {
	registry *Registry
}

func NewService(registry *Registry) *Service {
	return &Service{registry: registry}
}

func (s *Service) Calculate(operation string, operands []string) (string, error) {
	op, ok := s.registry.Get(operation)
	if !ok {
		return "", newError(CodeUnsupportedOperation, fmt.Sprintf("Unsupported operation: %q", operation))
	}
	if len(operands) != op.Arity() {
		return "", newError(CodeInvalidOperandCount,
			fmt.Sprintf("%s takes %d operand(s), got %d", operation, op.Arity(), len(operands)))
	}
	values := make([]*apd.Decimal, len(operands))
	for i, s := range operands {
		d, err := ParseNumber(s)
		if err != nil {
			return "", err
		}
		values[i] = d
	}
	result, err := op.Apply(values)
	if err != nil {
		return "", err
	}
	return FormatNumber(result), nil
}
