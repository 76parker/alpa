//go:build !embedui

package webui

import (
	"errors"
	"io/fs"
)

func embeddedAssets() (fs.FS, error) {
	return nil, errors.New("UI is not embedded: build with -tags=embedui or set http.ui_assets_dir to the frontend dist directory")
}
