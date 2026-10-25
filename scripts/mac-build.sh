#!/usr/bin/env bash
# Build bản macOS đã ký bằng chứng chỉ tự tạo "Ghosthand Dev" + đóng .dmg.
# Vì sao: bản không ký đổi chữ ký sau mỗi lần build → macOS coi là app mới và xoá quyền Accessibility / Screen Recording.
# Ký cùng một chứng chỉ + bundle ID cố định (app.ghosthand) thì quyền được giữ qua các bản build.
# Chạy: scripts/mac-build.sh        (lần đầu tự tạo chứng chỉ, macOS có thể hỏi mật khẩu máy)
set -euo pipefail
cd "$(dirname "$0")/.."

CERT="Ghosthand Dev"
APP="build/bin/ghosthand.app"
BUNDLE_ID="app.ghosthand"
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"

if ! security find-identity -v -p codesigning | grep -q "\"$CERT\""; then
  echo "Tạo chứng chỉ ký tự tạo \"$CERT\" (một lần, hạn 10 năm)…"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  /usr/bin/openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=$CERT" \
    -keyout "$tmp/key.pem" -out "$tmp/cert.pem" \
    -addext "keyUsage=critical,digitalSignature" -addext "extendedKeyUsage=critical,codeSigning" 2>/dev/null
  /usr/bin/openssl pkcs12 -export -inkey "$tmp/key.pem" -in "$tmp/cert.pem" -out "$tmp/id.p12" -passout pass:ghosthand
  security import "$tmp/id.p12" -k "$KEYCHAIN" -P ghosthand -T /usr/bin/codesign >/dev/null
  # tin cậy riêng cho việc ký code – không có bước này identity bị coi là không hợp lệ
  security add-trusted-cert -r trustRoot -p codeSign -k "$KEYCHAIN" "$tmp/cert.pem"
fi

export PATH="$PATH:$HOME/go/bin"
wails build
codesign --force --deep --sign "$CERT" --identifier "$BUNDLE_ID" "$APP"
codesign --verify --deep --strict "$APP"
echo "Chữ ký:"; codesign -dr - "$APP" 2>&1 | grep designated

ver="$(plutil -extract CFBundleShortVersionString raw "$APP/Contents/Info.plist")"
dmg="build/bin/Ghosthand-$ver.dmg"
rm -f "$dmg"
hdiutil create -volname "Ghosthand" -srcfolder "$APP" -ov -format UDZO "$dmg" >/dev/null
echo "Xong: $dmg"
echo "Cài: kéo Ghosthand vào /Applications (cấp quyền cho bản trong /Applications, đừng cấp cho bản trong build/bin)."
