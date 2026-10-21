export type BinaryOperation = 'add' | 'subtract' | 'multiply' | 'divide'
export type UnaryOperation = 'sqrt' | 'square' | 'reciprocal'
export type Operation = BinaryOperation | UnaryOperation | 'percent' | 'percent_of'

export type ApiErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'INVALID_NUMBER'
  | 'UNSUPPORTED_OPERATION'
  | 'INVALID_OPERAND_COUNT'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'DIVISION_BY_ZERO'
  | 'UNDEFINED_RESULT'
  | 'INVALID_DOMAIN'
  | 'OVERFLOW'
  | 'INTERNAL_ERROR'

export type ErrorCode = ApiErrorCode | 'NETWORK_ERROR'

export type CalculationRequest = { operation: Operation; operands: string[] }

export type CalculationResult = { ok: true; result: string } | { ok: false; code: ErrorCode }
