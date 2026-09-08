package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/76parker/alpa/internal/bootstrap"
	"github.com/76parker/alpa/internal/config"
)

const (
	configPath    = "config.yaml"
	migrationsDir = "migrations"
)

func main() {
	cfg, err := config.LoadConfig(configPath)
	if err != nil {
		log.Printf("load configuration: %v", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := bootstrap.Run(ctx, cfg, migrationsDir); err != nil {
		log.Printf("run application: %v", err)
		os.Exit(1)
	}
}
