#!/usr/bin/env bash
# In ra cờ -ldflags nhúng khoá OAuth Google (bước 54) vào bản build; dùng: LDF="$(scripts/oauth-ldflags.sh)".
# Nguồn: biến môi trường CLIENT_ID / CLIENT_SECRET, không có thì đọc file .env ở gốc repo (đã .gitignore).
# Không có khoá → in rỗng (build vẫn chạy, chỉ tính năng Đồng bộ báo thiếu khoá). Secret của Desktop app không bí mật
# tuyệt đối (Google cho phép nhúng), nhưng vẫn không commit.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -z "${CLIENT_ID:-}" ] && [ -f .env ]; then
  CLIENT_ID="$(grep -E '^CLIENT_ID=' .env | head -1 | cut -d= -f2- | tr -d '\r"'"'")"
  CLIENT_SECRET="$(grep -E '^CLIENT_SECRET=' .env | head -1 | cut -d= -f2- | tr -d '\r"'"'")"
fi
[ -n "${CLIENT_ID:-}" ] || exit 0
G=ghosthand/internal/cloud/gdrive
printf '%s' "-X $G.ClientID=$CLIENT_ID -X $G.ClientSecret=${CLIENT_SECRET:-}"
