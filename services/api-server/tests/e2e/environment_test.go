package e2e_test

import (
	"context"
	"log"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

type testEnvironment struct {
	postgres *postgresFixture
	server   *httptest.Server
}

func (e *testEnvironment) Close() {
	if e.server != nil {
		e.server.Close()
	}

	if e.postgres == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := e.postgres.Close(ctx); err != nil {
		log.Printf("terminate postgres container: %v", err)
	}
}

var environment *testEnvironment

func TestMain(m *testing.M) {
	setupCtx, cancel := context.WithTimeout(context.Background(), time.Minute)

	postgres, err := startPostgres(setupCtx)
	if err != nil {
		cancel()
		log.Fatal(err)
	}

	if err := migrateDatabase(setupCtx, postgres.pool); err != nil {
		cancel()
		(&testEnvironment{postgres: postgres}).Close()
		log.Fatal(err)
	}

	server, err := newTestHTTPServer(postgres.pool)
	cancel()
	if err != nil {
		(&testEnvironment{postgres: postgres}).Close()
		log.Fatal(err)
	}

	environment = &testEnvironment{
		postgres: postgres,
		server:   server,
	}

	exitCode := m.Run()
	environment.Close()
	os.Exit(exitCode)
}

func resetDatabase(t T) {
	t.Helper()

	if environment == nil || environment.postgres == nil {
		t.Fatal("E2E environment is not initialized")
	}

	ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
	defer cancel()

	_, err := environment.postgres.pool.Exec(ctx, `
  		TRUNCATE TABLE inventory.workspaces
  		RESTART IDENTITY
  		CASCADE
  	`)
	if err != nil {
		t.Fatalf("reset test database: %v", err)
	}
}
