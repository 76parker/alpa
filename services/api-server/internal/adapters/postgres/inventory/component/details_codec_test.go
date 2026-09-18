package component

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/76parker/alpa/internal/domain/inventory"
)

func TestInfrastructureDetailsCodecRoundTrip(t *testing.T) {
	t.Parallel()

	// The persistence boundary must store the public v1 field names and restore every value without changing endpoint order or duplicates.
	details, err := inventory.NewInfrastructureComponentDetails(
		inventory.InfrastructureTechnologyPostgreSQL,
		inventory.SystemTypeSQLDatabase,
		"17",
		[]string{"primary:5432", "replica:5432", "replica:5432"},
	)
	if err != nil {
		t.Fatalf("create details: %v", err)
	}

	encoded, err := Encode(details)
	if err != nil {
		t.Fatalf("encode details: %v", err)
	}
	var gotPayload any
	if err := json.Unmarshal(encoded, &gotPayload); err != nil {
		t.Fatalf("decode encoded JSON: %v", err)
	}
	var wantPayload any
	if err := json.Unmarshal([]byte(`{"schema_version":1,"technology":"postgresql","version":"17","system_type":"sql-database","endpoints":["primary:5432","replica:5432","replica:5432"]}`), &wantPayload); err != nil {
		t.Fatalf("decode expected JSON: %v", err)
	}
	if !reflect.DeepEqual(gotPayload, wantPayload) {
		t.Fatalf("encoded payload = %s, want %s", encoded, `{"schema_version":1,"technology":"postgresql","version":"17","system_type":"sql-database","endpoints":["primary:5432","replica:5432","replica:5432"]}`)
	}

	decoded, err := Decode(inventory.ComponentTypeInfrastructure, encoded)
	if err != nil {
		t.Fatalf("decode details: %v", err)
	}
	if !reflect.DeepEqual(decoded, details) {
		t.Fatalf("decoded details = %#v, want %#v", decoded, details)
	}
}
