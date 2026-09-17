package client

import (
	"context"
	"errors"
	"testing"

	"github.com/76parker/alpa/internal/domain/inventory"
)

func TestApplicationCreateEnforcesClientLimitInsideLockedTransaction(t *testing.T) {
	// This catches a regression where a sixth client is accepted after a stale count read.
	store := &clientStore{count: 5}
	app := NewApplication(store, clientTxManager{store: store})

	_, err := app.Create(t.Context(), validCreateCommand())
	if !errors.Is(err, inventory.ErrClientLimitExceeded) {
		t.Fatalf("Create() error = %v, want %v", err, inventory.ErrClientLimitExceeded)
	}
	if store.created {
		t.Fatal("Create() inserted a client after the limit was reached")
	}
	if !store.locked {
		t.Fatal("Create() counted clients without locking the component")
	}
}

func TestApplicationCreateAllowsFifthClient(t *testing.T) {
	// This catches an off-by-one limit that prevents the fifth client from being created.
	store := &clientStore{count: 4}
	created, err := NewApplication(store, clientTxManager{store: store}).Create(t.Context(), validCreateCommand())
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if !store.created || created.ID() != 7 {
		t.Fatalf("Create() = %#v, want restored fifth client", created)
	}
}

func validCreateCommand() CreateCommand {
	return CreateCommand{
		ComponentID:       42,
		ClientName:        inventory.RESTClient,
		Role:              inventory.CallerRole,
		CommunicationType: inventory.RequestResponse,
	}
}

type clientStore struct {
	count   int
	locked  bool
	created bool
}

func (s *clientStore) LockForUpdate(context.Context, int64) error {
	s.locked = true
	return nil
}

func (s *clientStore) CountByComponentID(context.Context, int64) (int, error) { return s.count, nil }

func (s *clientStore) Create(_ context.Context, _ int64, client inventory.ComponentClient) (inventory.ComponentClient, error) {
	s.created = true
	return inventory.RestoreComponentClient(
		7,
		client.Type().ClientName(),
		client.Type().Role(),
		client.Type().CommunicationType(),
		client.Description(),
		nil,
	), nil
}

func (*clientStore) BindAPI(context.Context, int64, int64, int64) (inventory.ComponentClient, error) {
	return inventory.ComponentClient{}, nil
}

type clientTxManager struct{ store *clientStore }

func (m clientTxManager) BindClientAPITx(_ context.Context, fn func(TxStores) error) error {
	return fn(TxStores{Components: m.store, Clients: m.store})
}

func (m clientTxManager) ExecuteWriteClientTx(_ context.Context, fn func(TxStores) error) error {
	return fn(TxStores{Components: m.store, Clients: m.store})
}
