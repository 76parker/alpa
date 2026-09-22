package component

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"

	"github.com/76parker/alpa/internal/domain/inventory"
)

func TestInfrastructureDetailsCodecRoundTrip(t *testing.T) {
	t.Parallel()

	// The persistence boundary must store the public v1 field names and restore every value without changing endpoint order or duplicates.
	details, err := inventory.NewInfrastructureComponentDetails(
		inventory.PostgreSQL,
		inventory.SQLDatabase,
		inventory.CriticalInfrastructure,
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
	if err := json.Unmarshal([]byte(`{"schema_version":1,"technology_name":"postgresql","version":"17","technology_type":"sql-database","importancy":"critical","endpoints":["primary:5432","replica:5432","replica:5432"]}`), &wantPayload); err != nil {
		t.Fatalf("decode expected JSON: %v", err)
	}
	if !reflect.DeepEqual(gotPayload, wantPayload) {
		t.Fatalf("encoded payload = %s, want %s", encoded, `{"schema_version":1,"technology_name":"postgresql","version":"17","technology_type":"sql-database","importancy":"critical","endpoints":["primary:5432","replica:5432","replica:5432"]}`)
	}

	decoded, err := Decode(inventory.Infrastructure, encoded)
	if err != nil {
		t.Fatalf("decode details: %v", err)
	}
	if !reflect.DeepEqual(decoded, details) {
		t.Fatalf("decoded details = %#v, want %#v", decoded, details)
	}
}

func TestServiceDetailsCodecCanonicalizesLanguage(t *testing.T) {
	t.Parallel()

	repositoryURL := "https://github.com/example/service"
	details, err := inventory.NewBackendServiceComponentDetails(inventory.Language("Go"), &repositoryURL)
	if err != nil {
		t.Fatalf("create details: %v", err)
	}

	encoded, err := Encode(details)
	if err != nil {
		t.Fatalf("encode details: %v", err)
	}
	if got := string(encoded); !strings.Contains(got, `"core_language":"go"`) {
		t.Fatalf("encoded payload = %s, want lowercase core_language", encoded)
	}
	if got := string(encoded); !strings.Contains(got, `"repository_url":"https://github.com/example/service"`) {
		t.Fatalf("encoded payload = %s, want repository_url", encoded)
	}

	decoded, err := Decode(inventory.Backend, encoded)
	if err != nil {
		t.Fatalf("decode details: %v", err)
	}
	got, ok := decoded.(inventory.BackendServiceComponentDetails)
	if !ok {
		t.Fatalf("decoded details type = %T, want backend service details", decoded)
	}
	if got.Language != inventory.LanguageGo {
		t.Fatalf("decoded language = %q, want %q", got.Language, inventory.LanguageGo)
	}
}
