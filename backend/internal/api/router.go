package api

import (
	"log/slog"
	"net/http"
)

// NewRouter returns the HTTP handler for the whole API. Routes are registered without
// a method so that wrong methods get a JSON 405 instead of the default plain-text one.
func NewRouter(calc Calculator, logger *slog.Logger, allowedOrigin string) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/api/v1/calculate",
		allowMethod(requireJSON(limitBody(calculateHandler(calc, logger))), http.MethodPost))
	mux.Handle("/healthz", allowMethod(http.HandlerFunc(healthHandler), http.MethodGet))
	mux.HandleFunc("/", notFoundHandler)

	return recoverPanics(logRequests(cors(mux, allowedOrigin), logger), logger)
}
