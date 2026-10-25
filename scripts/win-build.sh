#!/usr/bin/env bash
# Build Windows tại máy Windows (Git Bash): scripts/win-build.sh [X.Y.Z]  (hoặc: make win V=1.0.1)
# Ra build/bin/ghosthand.exe (bản không cài đặt, chạy luôn) và Ghosthand-<V>-portable.zip.
# Muốn thêm bộ cài: cài NSIS (makensis trong PATH) – script tự thêm -nsis.
set -euo pipefail
cd "$(dirname "$0")/.."
V="${1:-dev}"
bash scripts/fetch-tesseract.sh
NSIS=""; command -v makensis >/dev/null && [[ "$V" != dev ]] && NSIS="-nsis"
wails build $NSIS -ldflags "-X ghosthand/internal/update.Version=$V"
cd build/bin && rm -f "Ghosthand-$V-portable.zip" && 7z a "Ghosthand-$V-portable.zip" ghosthand.exe >/dev/null && cd ../..
echo "Xong: build/bin/ghosthand.exe + build/bin/Ghosthand-$V-portable.zip"
