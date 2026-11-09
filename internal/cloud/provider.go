// Package cloud – đồng bộ kịch bản, tệp đi kèm, cài đặt (và bí mật đã mã hoá) giữa nhiều máy qua một kho trên cloud
// (bước 54). Package này không biết Google Drive: nó chỉ nói chuyện với Provider; engine so ba bên (sync.go) là hàm
// thuần có test. Không bao giờ tự ghi đè khi hai bên cùng đổi – hỏi qua Resolver.
package cloud

import (
	"context"
	"errors"
)

// Đường dẫn trên cloud dùng "/" ở mọi hệ điều hành. Tiền tố quyết định phạm vi (scope.go).
const (
	ManifestPath = "manifest.json"
	ScriptsDir   = "scripts/"
	AssetsDir    = "assets/"
	SettingsPath = "settings.json"
	SecretsPath  = "secrets.enc"
)

// Lỗi chuẩn của Provider.
var (
	ErrNotFound     = errors.New("không có trên cloud")
	ErrPrecondition = errors.New("cloud đã đổi so với lần đọc trước (ifMatch không khớp)") // máy khác ghi xen vào
)

// IfAny – ifMatch "ghi đè không điều kiện". ifMatch "" = chỉ tạo mới (đã có → ErrPrecondition); còn lại = phải đúng version.
const IfAny = "*"

// Provider – kho cloud: một cây file phẳng theo đường dẫn. Version là chuỗi đục (etag / headRevisionId).
type Provider interface {
	// Get đọc file; không có → ErrNotFound.
	Get(ctx context.Context, path string) (data []byte, version string, err error)
	// Put ghi file theo ifMatch, trả version mới.
	Put(ctx context.Context, path string, data []byte, ifMatch string) (version string, err error)
	// Delete xoá file; không có thì coi như xong.
	Delete(ctx context.Context, path string) error
}
