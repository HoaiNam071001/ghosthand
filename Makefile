# Lệnh gõ nhanh (xem CLAUDE.md → Lệnh)
.PHONY: dev mac win release test dev-install
dev:           ## chạy app (hot reload)
	wails dev
mac:           ## macOS: build + ký + .dmg   (make mac V=1.0.1)
	VERSION=$(V) scripts/mac-build.sh
dev-install:   ## macOS: build bản dev, cài đè /Applications/Ghosthand.app, mở lại nền (AI thử qua MCP ngay)
	scripts/dev-install.sh
win:           ## Windows (Git Bash): exe + portable.zip   (make win V=1.0.1)
	bash scripts/win-build.sh $(V)
release:       ## phát hành: dmg + tag + Release; Windows tự build trên GitHub   (make release V=1.0.1)
	scripts/release.sh $(V)
test:          ## Go + frontend
	go vet ./... && go test ./... && cd frontend && npm run build && npm test
