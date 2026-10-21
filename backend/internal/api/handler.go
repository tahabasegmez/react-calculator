package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
)

// Calculator performs one named operation on string operands.
type Calculator interface {
	Calculate(operation string, operands []string) (string, error)
}

type calculateRequest struct {
	Operation *string   `json:"operation"`
	Operands  *[]string `json:"operands"`
}

type calculateResponse struct {
	Operation string `json:"operation"`
	Result    string `json:"result"`
}

func calculateHandler(calc Calculator, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req calculateRequest
		if !decodeBody(w, r, &req) {
			return
		}
		if req.Operation == nil || req.Operands == nil {
			writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", `"operation" and "operands" are required`)
			return
		}
		result, err := calc.Calculate(*req.Operation, *req.Operands)
		if err != nil {
			writeCalculationError(w, logger, err)
			return
		}
		writeJSON(w, http.StatusOK, calculateResponse{Operation: *req.Operation, Result: result})
	}
}

// decodeBody decodes exactly one JSON value into dst and writes an error response if that fails.
func decodeBody(w http.ResponseWriter, r *http.Request, dst any) bool {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			writeError(w, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE", "Request body exceeds 4 KiB")
		} else {
			writeError(w, http.StatusBadRequest, "INVALID_JSON", "Request body could not be read")
		}
		return false
	}

	dec := json.NewDecoder(bytes.NewReader(body))
	dec.DisallowUnknownFields()
	err = dec.Decode(dst)
	if err == nil && dec.Decode(&json.RawMessage{}) != io.EOF {
		err = errors.New("unexpected data after the JSON value")
	}
	if err == nil {
		return true
	}

	var typeErr *json.UnmarshalTypeError
	switch {
	case errors.As(err, &typeErr):
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Wrong type for "+describeField(typeErr.Field))
	case strings.HasPrefix(err.Error(), "json: unknown field "):
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Unknown field "+strings.TrimPrefix(err.Error(), "json: unknown field "))
	default:
		writeError(w, http.StatusBadRequest, "INVALID_JSON", "Request body is not valid JSON")
	}
	return false
}

func describeField(field string) string {
	if field == "" {
		return "the request body"
	}
	return strconv.Quote(field)
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func notFoundHandler(w http.ResponseWriter, _ *http.Request) {
	writeError(w, http.StatusNotFound, "NOT_FOUND", "Not found")
}
