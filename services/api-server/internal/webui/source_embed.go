//go:build embedui

package webui

import (
	"embed"
	"io/fs"
)

//go:embed dist
var embedded embed.FS

func embeddedAssets() (fs.FS, error) {
	return fs.Sub(embedded, "dist")
}
