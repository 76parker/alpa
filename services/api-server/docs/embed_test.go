package docs

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/goccy/go-yaml"
)

func TestOpenAPIDocumentsAreValidAndEquivalent(t *testing.T) {
	t.Parallel()

	var yamlDocument any
	if err := yaml.Unmarshal(OpenAPIYAML, &yamlDocument); err != nil {
		t.Fatalf("decode OpenAPI YAML: %v", err)
	}
	yamlJSON, err := json.Marshal(yamlDocument)
	if err != nil {
		t.Fatalf("encode decoded OpenAPI YAML as JSON: %v", err)
	}

	var jsonDocument any
	if err := json.Unmarshal(OpenAPIJSON, &jsonDocument); err != nil {
		t.Fatalf("decode OpenAPI JSON: %v", err)
	}
	var normalizedYAMLDocument any
	if err := json.Unmarshal(yamlJSON, &normalizedYAMLDocument); err != nil {
		t.Fatalf("decode normalized OpenAPI YAML: %v", err)
	}

	if !reflect.DeepEqual(normalizedYAMLDocument, jsonDocument) {
		t.Fatal("OpenAPI YAML and JSON differ")
	}
}
