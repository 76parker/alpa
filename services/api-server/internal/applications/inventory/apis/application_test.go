package apis

import (
	"context"
	"errors"
	"testing"

	"github.com/76parker/alpa/internal/domain/inventory"
)

func TestApplicationCreate(t *testing.T) {
	t.Parallel()

	storeErr := errors.New("store unavailable")
	tests := []struct {
		name       string
		command    CreateCommand
		storeErr   error
		wantErr    error
		wantStored bool
	}{
		{
			name: "valid/api is created for component",
			command: CreateCommand{
				ComponentID:     42,
				Name:            "orders",
				APIType:         inventory.APITypeREST,
				NetworkExposure: inventory.NetworkExposureInternal,
			},
			wantStored: true,
		},
		{
			name: "invalid/non-positive component id",
			command: CreateCommand{
				ComponentID:     0,
				Name:            "orders",
				APIType:         inventory.APITypeREST,
				NetworkExposure: inventory.NetworkExposureInternal,
			},
			wantErr: inventory.ErrNegativeID,
		},
		{
			name: "invalid/empty api name",
			command: CreateCommand{
				ComponentID:     42,
				APIType:         inventory.APITypeREST,
				NetworkExposure: inventory.NetworkExposureInternal,
			},
			wantErr: inventory.ErrInvalidAPIName,
		},
		{
			name: "invalid/unknown api type",
			command: CreateCommand{
				ComponentID:     42,
				Name:            "orders",
				APIType:         inventory.APIType("unknown"),
				NetworkExposure: inventory.NetworkExposureInternal,
			},
			wantErr: inventory.ErrUnknownAPIType,
		},
		{
			name: "invalid/unknown network exposure",
			command: CreateCommand{
				ComponentID:     42,
				Name:            "orders",
				APIType:         inventory.APITypeREST,
				NetworkExposure: inventory.NetworkExposure("unknown"),
			},
			wantErr: inventory.ErrInvalidExposure,
		},
		{
			name: "invalid/store failure",
			command: CreateCommand{
				ComponentID:     42,
				Name:            "orders",
				APIType:         inventory.APITypeREST,
				NetworkExposure: inventory.NetworkExposureInternal,
			},
			storeErr:   storeErr,
			wantErr:    storeErr,
			wantStored: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			store := &apiStore{err: tt.storeErr}
			created, err := NewApplication(store, apiTxManager{store: store}).Create(t.Context(), tt.command)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Create() error = %v, want %v", err, tt.wantErr)
			}
			if store.called != tt.wantStored {
				t.Fatalf("Store.Create() called = %v, want %v", store.called, tt.wantStored)
			}
			if !tt.wantStored || tt.storeErr != nil {
				return
			}
			if store.componentID != tt.command.ComponentID {
				t.Fatalf("Store.Create() componentID = %d, want %d", store.componentID, tt.command.ComponentID)
			}
			if created.ID() != 7 || created.Name() != tt.command.Name || created.APIType() != tt.command.APIType || created.Exposure() != tt.command.NetworkExposure {
				t.Fatalf("Create() = (%d, %q, %q, %q), want restored API", created.ID(), created.Name(), created.APIType(), created.Exposure())
			}
		})
	}
}

func TestApplicationCreateEnforcesAPILimitInsideLockedTransaction(t *testing.T) {
	// This catches a regression where the sixth API is accepted after a stale count read.
	store := &limitAPIStore{count: 5}
	app := NewApplication(store, limitAPITxManager{store: store})
	_, err := app.Create(t.Context(), CreateCommand{
		ComponentID:     42,
		Name:            "orders",
		APIType:         inventory.APITypeREST,
		NetworkExposure: inventory.NetworkExposureInternal,
	})
	if !errors.Is(err, inventory.ErrAPILimitExceeded) {
		t.Fatalf("Create() error = %v, want %v", err, inventory.ErrAPILimitExceeded)
	}
	if store.created {
		t.Fatal("Create() inserted an API after the limit was reached")
	}
	if !store.locked {
		t.Fatal("Create() counted APIs without locking the component")
	}
}

type apiStore struct {
	called      bool
	componentID int64
	err         error
}

func (*apiStore) CountByComponentID(context.Context, int64) (int, error) { return 0, nil }

func (s *apiStore) Create(_ context.Context, componentID int64, api inventory.ComponentAPI) (inventory.ComponentAPI, error) {
	s.called = true
	s.componentID = componentID
	if s.err != nil {
		return inventory.ComponentAPI{}, s.err
	}
	return inventory.RestoreAPI(7, api.Name(), api.Exposure(), api.APIType()), nil
}

type apiTxManager struct {
	store Store
}

func (m apiTxManager) ExecuteWriteAPITx(_ context.Context, fn func(TxStores) error) error {
	return fn(TxStores{Components: apiComponentStore{}, APIs: m.store})
}

type apiComponentStore struct{}

func (apiComponentStore) LockForUpdate(context.Context, int64) error { return nil }

type limitAPIStore struct {
	count   int
	locked  bool
	created bool
}

func (s *limitAPIStore) LockForUpdate(context.Context, int64) error {
	s.locked = true
	return nil
}
func (s *limitAPIStore) CountByComponentID(context.Context, int64) (int, error) { return s.count, nil }
func (s *limitAPIStore) Create(_ context.Context, _ int64, api inventory.ComponentAPI) (inventory.ComponentAPI, error) {
	s.created = true
	return inventory.RestoreAPI(7, api.Name(), api.Exposure(), api.APIType()), nil
}

type limitAPITxManager struct{ store *limitAPIStore }

func (m limitAPITxManager) ExecuteWriteAPITx(_ context.Context, fn func(TxStores) error) error {
	return fn(TxStores{Components: m.store, APIs: m.store})
}
