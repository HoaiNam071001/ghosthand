# Ghosthand (Bàn Tay Ảo)

Desktop app tự động click theo kịch bản: chọn vùng / toàn màn hình, chọn điểm, nối theo thứ tự, cấu hình thời gian và số lần click, kéo thả giữa 2 điểm.

Stack: Wails v2 (Go) · React + TypeScript · Tailwind v4 · robotgo · gohook.

## Chạy

```bash
wails dev     # phát triển, hot reload
wails build   # build ra build/bin/
```

## Cài đặt và phát hành

**macOS** – `make mac V=1.0.1` (hoặc `scripts/mac-build.sh`) build, ký bằng chứng chỉ tự tạo "Ghosthand Dev" rồi ra `build/bin/Ghosthand-<V>.dmg`. Mở `.dmg`, kéo Ghosthand vào Applications, cấp quyền **Accessibility** và **Screen Recording** cho bản trong `/Applications` (một lần). Các bản build sau chép đè lên là quyền được giữ (cùng chữ ký + bundle ID `app.ghosthand`). Chứng chỉ tự tạo chỉ dùng được trên máy build; máy khác mở app sẽ bị Gatekeeper chặn (chuột phải → Mở).

**Windows** – hai dạng:
- *Không cài đặt*: giải nén `Ghosthand-<V>-portable.zip`, chạy `ghosthand.exe` (OCR tiếng Việt đã nhúng sẵn).
- *Bộ cài*: chạy `Ghosthand-<V>-setup.exe`.
- Build tại máy Windows (Git Bash): `make win V=1.0.1` hoặc `bash scripts/win-build.sh 1.0.1`.

Cả hai chưa ký số nên Windows SmartScreen sẽ cảnh báo – chọn *More info → Run anyway*.

**Phát hành bản mới** (cần `gh`: `brew install gh && gh auth login`, cây git sạch, nhánh `main`):

```bash
make release V=1.0.1   # build .dmg + đẩy main + tag v1.0.1 + tạo GitHub Release
```

Tag `v*.*.*` kích hoạt workflow *Release Windows* (`.github/workflows/release-windows.yml`) tự build `setup.exe` + `portable.zip` và đính vào cùng Release (theo dõi: `gh run watch`).

**Báo bản mới** – app hỏi GitHub Releases (`releases/latest`) khoảng 5 giây sau khi mở, hoặc bấm *Cài đặt → Giới thiệu → Kiểm tra bản mới*. Chỉ báo, không tự cài; chỉ `git push` thì app không biết – phải có Release với tag số cao hơn bản đang chạy. Bản tự build không gắn số (`dev`) không nhắc.

Kế hoạch và tiến độ: [docs/tasks/](docs/tasks/README.md). Hướng dẫn cho Claude Code: [CLAUDE.md](CLAUDE.md).
