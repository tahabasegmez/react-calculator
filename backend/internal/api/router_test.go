package api

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/tahabasegmez/react-calculator/backend/internal/calculator"
)

var discardLogger = slog.New(slog.NewTextHandler(io.Discard, nil))

func newTestRouter(allowedOrigin string) http.Handler {
	return NewRouter(calculator.NewService(calculator.NewDefaultRegistry()), discardLogger, allowedOrigin)
}

func do(h http.Handler, method, path, contentType, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func decodeError(t *testing.T, rec *httptest.ResponseRecorder) errorBody {
	t.Helper()
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("got Content-Type %q, want application/json", ct)
	}
	var body errorResponse
	dec := json.NewDecoder(rec.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&body); err != nil {
		t.Fatalf("response is not an error JSON body: %v", err)
	}
	if body.Error.Message == "" {
		t.Fatal("error message is empty")
	}
	return body.Error
}

func TestCalculateReturnsResult(t *testing.T) {
	cases := []struct {
		name        string
		contentType string
		body        string
		want        string
	}{
		{"binary operation", "application/json", `{"operation":"add","operands":["0.1","0.2"]}`, `{"operation":"add","result":"0.3"}`},
		{"unary operation", "application/json", `{"operation":"sqrt","operands":["9"]}`, `{"operation":"sqrt","result":"3"}`},
		{"content type with charset", "application/json; charset=utf-8", `{"operation":"add","operands":["1","2"]}`, `{"operation":"add","result":"3"}`},
		{"body of exactly 4 KiB", "application/json", padTo(`{"operation":"add","operands":["1","2"]}`, maxBodyBytes), `{"operation":"add","result":"3"}`},
	}
	h := newTestRouter("")
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := do(h, http.MethodPost, "/api/v1/calculate", tc.contentType, tc.body)
			if rec.Code != http.StatusOK {
				t.Fatalf("got status %d, want 200 (body %s)", rec.Code, rec.Body)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
				t.Fatalf("got Content-Type %q, want application/json", ct)
			}
			if got := strings.TrimSpace(rec.Body.String()); got != tc.want {
				t.Fatalf("got body %s, want %s", got, tc.want)
			}
		})
	}
}

// padTo appends whitespace so the JSON body has exactly n bytes.
func padTo(body string, n int) string {
	return body + strings.Repeat(" ", n-len(body))
}

func TestErrorResponses(t *testing.T) {
	const path = "/api/v1/calculate"
	const jsonType = "application/json"
	cases := []struct {
		name        string
		method      string
		path        string
		contentType string
		body        string
		wantStatus  int
		wantCode    string
	}{
		{"unknown path", http.MethodGet, "/api/v1/unknown", "", "", 404, "NOT_FOUND"},
		{"unknown path with POST", http.MethodPost, "/nope", "text/plain", "x", 404, "NOT_FOUND"},
		{"wrong method on calculate", http.MethodGet, path, "", "", 405, "METHOD_NOT_ALLOWED"},
		{"wrong method on healthz", http.MethodPost, "/healthz", "text/plain", "x", 405, "METHOD_NOT_ALLOWED"},
		{"OPTIONS without CORS", http.MethodOptions, path, "", "", 405, "METHOD_NOT_ALLOWED"},
		{"missing content type", http.MethodPost, path, "", `{}`, 415, "UNSUPPORTED_MEDIA_TYPE"},
		{"wrong content type", http.MethodPost, path, "text/plain", `{}`, 415, "UNSUPPORTED_MEDIA_TYPE"},
		{"body above 4 KiB", http.MethodPost, path, jsonType, padTo(`{"operation":"add","operands":["1","2"]}`, maxBodyBytes+1), 413, "PAYLOAD_TOO_LARGE"},
		{"empty body", http.MethodPost, path, jsonType, ``, 400, "INVALID_JSON"},
		{"malformed JSON", http.MethodPost, path, jsonType, `{"operation":`, 400, "INVALID_JSON"},
		{"trailing data", http.MethodPost, path, jsonType, `{"operation":"add","operands":["1","2"]} {}`, 400, "INVALID_JSON"},
		{"missing operation", http.MethodPost, path, jsonType, `{"operands":["1","2"]}`, 400, "VALIDATION_ERROR"},
		{"missing operands", http.MethodPost, path, jsonType, `{"operation":"add"}`, 400, "VALIDATION_ERROR"},
		{"null operands", http.MethodPost, path, jsonType, `{"operation":"add","operands":null}`, 400, "VALIDATION_ERROR"},
		{"number instead of string", http.MethodPost, path, jsonType, `{"operation":"add","operands":[1,2]}`, 400, "VALIDATION_ERROR"},
		{"body is not an object", http.MethodPost, path, jsonType, `[]`, 400, "VALIDATION_ERROR"},
		{"unknown field", http.MethodPost, path, jsonType, `{"operation":"add","operands":["1","2"],"x":1}`, 400, "VALIDATION_ERROR"},
		{"unknown operation", http.MethodPost, path, jsonType, `{"operation":"power","operands":["2","3"]}`, 400, "UNSUPPORTED_OPERATION"},
		{"wrong operand count", http.MethodPost, path, jsonType, `{"operation":"add","operands":["1"]}`, 400, "INVALID_OPERAND_COUNT"},
		{"invalid number", http.MethodPost, path, jsonType, `{"operation":"add","operands":["1","abc"]}`, 400, "INVALID_NUMBER"},
		{"division by zero", http.MethodPost, path, jsonType, `{"operation":"divide","operands":["1","0"]}`, 422, "DIVISION_BY_ZERO"},
		{"zero divided by zero", http.MethodPost, path, jsonType, `{"operation":"divide","operands":["0","0"]}`, 422, "UNDEFINED_RESULT"},
		{"square root of a negative number", http.MethodPost, path, jsonType, `{"operation":"sqrt","operands":["-4"]}`, 422, "INVALID_DOMAIN"},
		{"overflow", http.MethodPost, path, jsonType, `{"operation":"square","operands":["1e5000"]}`, 422, "OVERFLOW"},

		// Several faults: the earliest check decides.
		{"wrong content type before body size", http.MethodPost, path, "text/plain", strings.Repeat("x", maxBodyBytes+1), 415, "UNSUPPORTED_MEDIA_TYPE"},
		{"body size before JSON syntax", http.MethodPost, path, jsonType, strings.Repeat("x", maxBodyBytes+1), 413, "PAYLOAD_TOO_LARGE"},
		{"unknown field before operation name", http.MethodPost, path, jsonType, `{"operation":"power","operands":["1","2"],"x":1}`, 400, "VALIDATION_ERROR"},
		{"operation name before operand count", http.MethodPost, path, jsonType, `{"operation":"power","operands":[]}`, 400, "UNSUPPORTED_OPERATION"},
		{"operand count before operand format", http.MethodPost, path, jsonType, `{"operation":"add","operands":["abc"]}`, 400, "INVALID_OPERAND_COUNT"},
		{"operand format before calculation", http.MethodPost, path, jsonType, `{"operation":"divide","operands":["abc","0"]}`, 400, "INVALID_NUMBER"},
	}
	h := newTestRouter("")
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := do(h, tc.method, tc.path, tc.contentType, tc.body)
			if rec.Code != tc.wantStatus {
				t.Fatalf("got status %d, want %d (body %s)", rec.Code, tc.wantStatus, rec.Body)
			}
			if got := decodeError(t, rec); got.Code != tc.wantCode {
				t.Fatalf("got code %q, want %q", got.Code, tc.wantCode)
			}
		})
	}
}

func TestMethodNotAllowedListsAllowedMethod(t *testing.T) {
	rec := do(newTestRouter(""), http.MethodGet, "/api/v1/calculate", "", "")
	if got := rec.Header().Get("Allow"); got != http.MethodPost {
		t.Fatalf("got Allow %q, want POST", got)
	}
}

func TestHealthz(t *testing.T) {
	rec := do(newTestRouter(""), http.MethodGet, "/healthz", "", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want 200", rec.Code)
	}
	if got := strings.TrimSpace(rec.Body.String()); got != `{"status":"ok"}` {
		t.Fatalf("got body %s", got)
	}
}

type failingCalculator struct{}

func (failingCalculator) Calculate(string, []string) (string, error) {
	return "", errors.New("secret internal detail")
}

func TestUnexpectedErrorReturnsInternalErrorWithoutDetails(t *testing.T) {
	h := NewRouter(failingCalculator{}, discardLogger, "")
	rec := do(h, http.MethodPost, "/api/v1/calculate", "application/json", `{"operation":"add","operands":["1","2"]}`)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("got status %d, want 500", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "secret") {
		t.Fatalf("internal detail leaked: %s", rec.Body)
	}
	if got := decodeError(t, rec); got.Code != "INTERNAL_ERROR" {
		t.Fatalf("got code %q, want INTERNAL_ERROR", got.Code)
	}
}

func TestPanicReturnsInternalError(t *testing.T) {
	h := recoverPanics(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	}), discardLogger)
	rec := do(h, http.MethodGet, "/", "", "")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("got status %d, want 500", rec.Code)
	}
	if got := decodeError(t, rec); got.Code != "INTERNAL_ERROR" {
		t.Fatalf("got code %q, want INTERNAL_ERROR", got.Code)
	}
}

func TestCORS(t *testing.T) {
	const origin = "https://calc.example"
	t.Run("no CORS headers when no origin is configured", func(t *testing.T) {
		rec := do(newTestRouter(""), http.MethodGet, "/healthz", "", "")
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Fatalf("got Access-Control-Allow-Origin %q, want none", got)
		}
	})
	t.Run("adds the configured origin to responses", func(t *testing.T) {
		rec := do(newTestRouter(origin), http.MethodGet, "/healthz", "", "")
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != origin {
			t.Fatalf("got Access-Control-Allow-Origin %q, want %q", got, origin)
		}
	})
	t.Run("answers a preflight request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/calculate", nil)
		req.Header.Set("Origin", origin)
		req.Header.Set("Access-Control-Request-Method", http.MethodPost)
		rec := httptest.NewRecorder()
		newTestRouter(origin).ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("got status %d, want 204", rec.Code)
		}
		if got := rec.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(got, http.MethodPost) {
			t.Fatalf("got Access-Control-Allow-Methods %q, want POST included", got)
		}
		if got := rec.Header().Get("Access-Control-Allow-Headers"); got != "Content-Type" {
			t.Fatalf("got Access-Control-Allow-Headers %q, want Content-Type", got)
		}
	})
}
