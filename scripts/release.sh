#!/usr/bin/env bash
# Phát hành một phiên bản: scripts/release.sh 1.0.1   (hoặc: make release V=1.0.1)
# - build macOS (ký + .dmg) tại máy này,
# - gắn tag vX.Y.Z + đẩy lên GitHub → workflow "Release Windows" tự build setup.exe + portable.zip và đính vào Release,
# - tạo / cập nhật Release kèm .dmg → app của người dùng báo có bản mới.
# Cần: gh (brew install gh && gh auth login), cây git sạch, đang ở nhánh main.
set -euo pipefail
cd "$(dirname "$0")/.."

V="${1:-}"
[[ "$V" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Dùng: scripts/release.sh X.Y.Z (vd 1.0.1)"; exit 1; }
command -v gh >/dev/null || { echo "Thiếu gh: brew install gh && gh auth login"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Còn file chưa commit – commit trước khi phát hành"; exit 1; }
[ "$(git branch --show-current)" = main ] || { echo "Phát hành từ nhánh main"; exit 1; }
git rev-parse "v$V" >/dev/null 2>&1 && { echo "Tag v$V đã có"; exit 1; }

VERSION="$V" scripts/mac-build.sh
DMG="build/bin/Ghosthand-$V.dmg"
shasum -a 256 "$DMG" | cut -d' ' -f1 > "$DMG.sha256"   # app kiểm mã này trước khi tự cài

git push origin main
git tag "v$V"
git push origin "v$V"    # kích hoạt build Windows trên GitHub

# Windows có thể đã tạo Release trước; có rồi thì chỉ đính thêm .dmg
if gh release view "v$V" >/dev/null 2>&1; then
  gh release upload "v$V" "$DMG" "$DMG.sha256" --clobber
else
  gh release create "v$V" "$DMG" "$DMG.sha256" --title "Ghosthand $V" --generate-notes
fi
echo "Xong. Bản Windows (setup + portable) sẽ tự đính vào Release sau vài phút: gh run watch"
