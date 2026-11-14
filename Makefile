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
release:       ## phát hành: dmg + tag + Release; Windows tự build trên GitHub   (make release [x|y|z|1.3.0] – tăng số ở vị trí X.Y.Z, bỏ trống = z)
	scripts/release.sh $(or $(V),$(word 2,$(MAKECMDGOALS)))
# "make release y": từ thứ hai là đối số của release, không phải target
ifeq (release,$(firstword $(MAKECMDGOALS)))
$(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS)):
	@:
endif
test:          ## Go + frontend
	go vet ./... && go test ./... && cd frontend && npm run build && npm test
