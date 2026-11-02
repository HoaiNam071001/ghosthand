package main

import (
	"embed"
	"os"
	"os/signal"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"

	"ghosthand/internal/app"
	"ghosthand/internal/cli"
	"ghosthand/internal/store"
	"ghosthand/internal/winfloat"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// `ghosthand run …` (bước 22): gửi lệnh sang app đang mở rồi thoát – không mở giao diện
	// `ghosthand --mcp` (bước 31): MCP qua stdio cho AI – chuyển tiếp sang app; stdin / stdout là pipe của AI, không gắn console
	if cli.IsMCP(os.Args[1:]) {
		c := cli.NewClient(nil)
		c.Launch = cli.LaunchBackground // app chưa mở thì mở nền – AI chạy mới hiện thanh mini
		os.Exit(c.MCP(os.Stdin, os.Stdout, os.Stderr))
	}
	if args := os.Args[1:]; cli.IsCommand(args) {
		cli.AttachConsole()
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, os.Interrupt)
		os.Exit(cli.Main(args, cli.NewClient(sig), os.Stdout, os.Stderr))
	}

	store.MigrateOldName()   // bước 45: dữ liệu ở thư mục tên cũ Auto Clicker → Ghosthand (tạm, xem store/migrate.go)
	winfloat.PrepareLaunch() // trước wails.Run – thanh mini / overlay nổi được trên app toàn màn hình (macOS)

	// Create an instance of the app structure
	a := app.NewApp(cli.IsBackground(os.Args[1:]))
	startup, shutdown, beforeClose := app.Hooks(a)

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "Ghosthand",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		// Frameless + nền trong suốt cố định từ đầu (Wails v2 không đổi được lúc chạy) để overlay nhìn xuyên được.
		// Mỗi màn tự vẽ nền; MainScreen có thanh tiêu đề riêng để kéo cửa sổ.
		Frameless:        true,
		StartHidden:      app.Background(a),
		BackgroundColour: &options.RGBA{R: 0, G: 0, B: 0, A: 0},
		Mac:              &mac.Options{WebviewIsTransparent: true},
		// Windows: chỉ WebviewIsTransparent thì cửa sổ Win32 vẫn đặc – cần WindowIsTranslucent (không bitmap nền) và
		// BackdropType None (không Mica / Acrylic) để nhìn xuyên đúng alpha của trang.
		Windows:       &windows.Options{WebviewIsTransparent: true, WindowIsTranslucent: true, BackdropType: windows.None},
		OnStartup:     startup,
		OnShutdown:    shutdown,
		OnBeforeClose: beforeClose,
		Bind: []interface{}{
			a,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
