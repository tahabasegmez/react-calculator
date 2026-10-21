package main

import (
	"flag"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/tahabasegmez/react-calculator/backend/internal/api"
	"github.com/tahabasegmez/react-calculator/backend/internal/calculator"
)

func main() {
	healthcheck := flag.Bool("healthcheck", false, "check /healthz of the running server and exit")
	flag.Parse()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if *healthcheck {
		os.Exit(checkHealth(port))
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	calc := calculator.NewService(calculator.NewDefaultRegistry())
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           api.NewRouter(calc, logger, os.Getenv("ALLOWED_ORIGIN")),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	logger.Info("server starting", "port", port)
	if err := server.ListenAndServe(); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

// checkHealth returns 0 if /healthz answers 200, otherwise 1.
func checkHealth(port string) int {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://127.0.0.1:" + port + "/healthz")
	if err != nil {
		return 1
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}
