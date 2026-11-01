#!/usr/bin/env bash
# Bản dev cài đè app đang cài rồi mở lại nền (59 U3) – vòng sửa code → cài → AI thử qua MCP, không cần Release.
# Ký qua mac-build.sh (chứng chỉ "Ghosthand Dev", bundle ID cố định) nên giữ quyền Accessibility / Screen Recording.
# Chạy: scripts/dev-install.sh   (make dev-install)   ·   DEST=/đường/dẫn/Ghosthand.app để cài chỗ khác
set -euo pipefail
cd "$(dirname "$0")/.."

DEST="${DEST:-/Applications/Ghosthand.app}"
NEW="build/bin/ghosthand.app"
API="$HOME/Library/Application Support/ghosthand/api.json"

NO_DMG=1 scripts/mac-build.sh
COMMIT="$(git rev-parse --short HEAD)$(git diff --quiet HEAD -- . ':!frontend/wailsjs' || echo -dirty)"

# Tiến trình app chính – bỏ proxy `ghosthand --mcp` của Claude (sống qua lần cài – 59 U6).
app_pids() { pgrep -fl "Ghosthand.app/Contents/MacOS/ghosthand" | grep -v -- '--mcp' || true; }

# Thoát app đang mở – bản mới biết lệnh quit; app bản cũ chưa có /quit (404 / 405) thì nhờ macOS đóng như bấm Cmd+Q.
quit_app() {
  local out
  if out="$("$NEW/Contents/MacOS/ghosthand" quit 2>&1)"; then
    echo "$out"
  elif grep -qE '404|405' <<<"$out"; then
    echo "App bản cũ chưa có lệnh thoát – đóng qua macOS…"
    osascript -e 'tell application id "app.ghosthand" to quit' || true
  else
    echo "$out" >&2
    echo "Không cài: app từ chối thoát (đang chạy kịch bản / kịch bản chưa lưu)." >&2
    exit 1
  fi
}

# `quit` chỉ chờ API tắt – tiến trình còn dọn dẹp thêm chút; mở lại khi nó chưa tắt hẳn thì LaunchServices báo -600.
# Vẫn còn tiến trình (app vừa được mở lại từ Dock / proxy, chưa kịp có API) thì thoát lại – tối đa 3 vòng.
for round in 1 2 3; do
  quit_app
  for _ in $(seq 50); do [ -z "$(app_pids)" ] && break; sleep 0.2; done
  [ -z "$(app_pids)" ] && break
  if [ "$round" = 3 ]; then
    echo "Không cài: app vẫn chạy (đang hỏi lưu?) – đóng app rồi chạy lại:" >&2
    app_pids >&2
    exit 1
  fi
  echo "App vẫn còn tiến trình – thoát lại…"
done

# Thay app: giữ bản cũ tới khi chép xong, lỗi thì trả lại
old="$DEST.old-$$"
if [ -e "$DEST" ]; then mv "$DEST" "$old"; fi
if ! ditto "$NEW" "$DEST"; then
  rm -rf "$DEST"
  [ -e "$old" ] && mv "$old" "$DEST"
  echo "Chép app lỗi – đã trả bản cũ." >&2
  exit 1
fi
rm -rf "$old"

# -600 vẫn có thể gặp vài trăm ms đầu sau khi thay bundle – thử lại
for i in $(seq 5); do
  open -g -a "$DEST" --args --background && break
  [ "$i" = 5 ] && { echo "Không mở được $DEST" >&2; exit 1; }
  sleep 1
done
# Chờ đúng bản vừa build lên (api.json mới + /health trả commit này)
for _ in $(seq 100); do
  got="$(python3 - "$API" <<'EOF' 2>/dev/null || true
import json, sys, urllib.request
port = json.load(open(sys.argv[1]))["port"]
print(json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=1)).get("commit", ""))
EOF
)"
  if [ "$got" = "$COMMIT" ]; then echo "Đã cài + mở lại: $DEST (commit $COMMIT)"; exit 0; fi
  sleep 0.3
done
echo "App chưa lên đúng bản $COMMIT sau 30 s (đang thấy: ${got:-không có})" >&2
exit 1
