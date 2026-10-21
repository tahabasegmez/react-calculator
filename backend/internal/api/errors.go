package api

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/tahabasegmez/react-calculator/backend/internal/calculator"
)

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: errorBody{Code: code, Message: message}})
}

func writeInternalError(w http.ResponseWriter) {
	writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
}

// writeCalculationError maps calculator errors to 400 or 422 and anything else to 500.
func writeCalculationError(w http.ResponseWriter, logger *slog.Logger, err error) {
	var calcErr *calculator.Error
	if !errors.As(err, &calcErr) {
		logger.Error("calculation failed", "error", err)
		writeInternalError(w)
		return
	}
	status := http.StatusUnprocessableEntity
	switch calcErr.Code {
	case calculator.CodeInvalidNumber, calculator.CodeUnsupportedOperation, calculator.CodeInvalidOperandCount:
		status = http.StatusBadRequest
	}
	writeError(w, status, string(calcErr.Code), calcErr.Message)
}
