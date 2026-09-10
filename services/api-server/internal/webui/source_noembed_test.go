//go:build !embedui

package webui

import (
	"strings"
	"testing"
)

func TestMissingEmbeddedUI(t *testing.T) {
	// Plain Go builds compile without frontend artifacts and explain how to supply them.
	if _, err := Load(""); err == nil || !strings.Contains(err.Error(), "embedui") {
		t.Fatalf("Load error = %v", err)
	}
}
