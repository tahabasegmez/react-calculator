package calculator

// Code identifies an error kind; clients select their UI text from it.
type Code string

const (
	CodeInvalidNumber        Code = "INVALID_NUMBER"
	CodeUnsupportedOperation Code = "UNSUPPORTED_OPERATION"
	CodeInvalidOperandCount  Code = "INVALID_OPERAND_COUNT"
	CodeDivisionByZero       Code = "DIVISION_BY_ZERO"
	CodeUndefinedResult      Code = "UNDEFINED_RESULT"
	CodeInvalidDomain        Code = "INVALID_DOMAIN"
	CodeOverflow             Code = "OVERFLOW"
)

// Error is an expected calculation or input error.
type Error struct {
	Code    Code
	Message string
}

func (e *Error) Error() string { return e.Message }

func newError(code Code, message string) *Error {
	return &Error{Code: code, Message: message}
}
