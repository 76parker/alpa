.DEFAULT_GOAL := build

.PHONY: deps frontend-deps go-deps config frontend embed build watch dev

deps: frontend-deps go-deps config

frontend-deps:
	cd services/frontend && npm ci --no-audit --no-fund

go-deps:
	cd services/api-server && go mod download && go mod vendor

config:
	@test -f services/api-server/config.yaml || cp services/api-server/config.example.yaml services/api-server/config.yaml

frontend:
	cd services/frontend && npm run build

embed: frontend
	rm -rf services/api-server/internal/webui/dist
	mkdir -p services/api-server/internal/webui/dist
	cp -R services/frontend/dist/. services/api-server/internal/webui/dist/

build: embed
	mkdir -p bin
	cd services/api-server && CGO_ENABLED=0 go build -mod=vendor -tags=embedui -buildvcs=false -trimpath -o ../../bin/api-server ./cmd

watch:
	cd services/frontend && npm run dev

dev: config
	cd services/api-server && go run -mod=vendor ./cmd
