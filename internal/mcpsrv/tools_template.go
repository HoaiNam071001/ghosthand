package mcpsrv

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"ghosthand/internal/model"
	"ghosthand/internal/vision"
)

// Soạn bằng cách thử (bước 31c): AI khoanh vùng trên ảnh chụp làm ảnh mẫu (capture_template), thử tìm (find_image) rồi
// ghi "tpl:<số>" vào trường template của node – ảnh base64 không đi qua AI, Go thay bằng ảnh thật lúc nhận kịch bản.

const tplRef = "tpl:"

type capturedTpl struct {
	png   string
	scale float64
}

// templates – ảnh mẫu AI vừa khoanh, theo số; sống đến khi tắt app (kịch bản lưu rồi thì ảnh nằm trong file).
type templates struct {
	mu   sync.Mutex
	next int
	byID map[string]capturedTpl
}

func (t *templates) add(c capturedTpl) string {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.next++
	if t.byID == nil {
		t.byID = map[string]capturedTpl{}
	}
	id := strconv.Itoa(t.next)
	t.byID[id] = c
	return id
}

func (t *templates) get(ref string) (capturedTpl, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	c, ok := t.byID[strings.TrimPrefix(ref, tplRef)]
	if !ok {
		return c, fmt.Errorf("không có ảnh mẫu %q – gọi capture_template để khoanh (ảnh mẫu mất khi tắt app)", ref)
	}
	return c, nil
}

type captureTplIn struct {
	areaIn
}

type findImageIn struct {
	Template  string `json:"template" jsonschema:"ảnh mẫu từ capture_template, dạng \"tpl:1\""`
	X         int    `json:"x,omitempty" jsonschema:"vùng tìm (toạ độ chuột); w = 0 = cả màn hình chính"`
	Y         int    `json:"y,omitempty"`
	W         int    `json:"w,omitempty"`
	H         int    `json:"h,omitempty"`
	Window    string `json:"window,omitempty" jsonschema:"tìm trong cửa sổ có tiêu đề / tên app chứa chữ này"`
	Threshold int    `json:"threshold,omitempty" jsonschema:"% khớp tối thiểu (mặc định 80)"`
	MatchMode string `json:"matchMode,omitempty" jsonschema:"\"\" = so độ sáng | edge = so viền (chịu đổi theme)"`
	ColorTol  int    `json:"colorTol,omitempty" jsonschema:"% lệch màu tối đa (0 = không kiểm tra màu)"`
}

func (s *Server) addTemplateTools() {
	addTool(s, KindScreen, &mcp.Tool{Name: "capture_template", Description: "Khoanh một vùng trên màn hình làm ảnh mẫu cho node waitImage / clickImage: " +
		"chụp vùng (x, y, w, h theo toạ độ chuột, hoặc window) → trả ảnh xem trước + \"template\": \"tpl:N\". Ghi chuỗi đó vào trường template của node " +
		"(app tự thay bằng ảnh thật khi create_script / update_script / run_script; templateScale tự điền). Thử trước bằng find_image. " +
		"Khoanh vừa nút / biểu tượng, chừa ít nền – ảnh trơn một màu khó khớp."}, s.captureTemplate)
	addTool(s, KindScreen, &mcp.Tool{Name: "find_image", Description: "Thử tìm ảnh mẫu (tpl:N từ capture_template) trên màn hình lúc này, một lần, không click: " +
		"{found, score, box, center}. Dùng để chọn threshold / matchMode trước khi ghi vào node; found=false thì xem score và thử matchMode edge hoặc khoanh lại."}, s.findImage)
	addTool(s, KindRead, &mcp.Tool{Name: "get_mouse_position", Description: "Vị trí chuột lúc này (toạ độ chuột, cùng hệ với get_screen_info) + màn hình chứa nó. " +
		"Hỏi người dùng đưa chuột tới chỗ cần rồi gọi tool này thay vì đoán toạ độ."}, s.mousePosition)
	addTool(s, KindRead, &mcp.Tool{Name: "list_windows", Description: "Cửa sổ đang mở (trên cùng trước): tiêu đề, app, khung, thu nhỏ hay không. " +
		"Nhẹ hơn describe_screen khi chỉ cần biết cửa sổ nào đang có."}, s.listWindows)
}

func (s *Server) captureTemplate(_ context.Context, _ *mcp.CallToolRequest, in captureTplIn) (*mcp.CallToolResult, any, error) {
	r, err := s.area(in.areaIn)
	if err != nil {
		return fail(err)
	}
	if in.Window == "" && in.W <= 0 {
		return fail(errors.New("cần vùng x, y, w, h (hoặc window) – nhìn screenshot rồi khoanh đúng nút / biểu tượng"))
	}
	if r.W < 8 || r.H < 8 {
		return fail(errors.New("vùng quá nhỏ (< 8 px) – ảnh mẫu cần có chi tiết"))
	}
	img, err := s.back.Capture(r)
	if err != nil {
		return fail(err)
	}
	png, err := vision.EncodePNG(img)
	if err != nil {
		return fail(err)
	}
	scale := s.back.TemplateScale(img, r)
	id := s.tpls.add(capturedTpl{png: png, scale: scale})
	c, w := pngContent(img)
	if c == nil {
		return fail(errors.New("không mã hoá được ảnh"))
	}
	res, _, err := ok(map[string]any{"template": tplRef + id, "area": r, "imageWidth": w, "templateScale": scale,
		"note": "ghi \"template\": \"" + tplRef + id + "\" vào node waitImage / clickImage; find_image để thử trước"})
	if err != nil {
		return nil, nil, err
	}
	res.Content = append(res.Content, c)
	return res, nil, nil
}

func (s *Server) findImage(_ context.Context, _ *mcp.CallToolRequest, in findImageIn) (*mcp.CallToolResult, any, error) {
	t, err := s.tpls.get(in.Template)
	if err != nil {
		return fail(err)
	}
	r, err := s.area(areaIn{Window: in.Window, X: in.X, Y: in.Y, W: in.W, H: in.H})
	if err != nil {
		return fail(err)
	}
	st := model.Step{Type: model.StepWaitImage, Template: t.png, TemplateScale: t.scale, Threshold: 80,
		MatchMode: in.MatchMode, ColorTol: in.ColorTol}
	if in.Threshold > 0 {
		st.Threshold = min(in.Threshold, 100)
	}
	res, err := s.back.FindImage(st, r)
	if err != nil {
		return fail(err)
	}
	box := model.Rect{X: res.X, Y: res.Y, W: res.W, H: res.H}
	out := map[string]any{"found": res.Found, "score": res.Score, "threshold": st.Threshold, "box": box,
		"center": model.Point{X: box.X + box.W/2, Y: box.Y + box.H/2}, "area": res.Area}
	if res.ColorDiff > 0 {
		out["colorDiff"] = res.ColorDiff
	}
	if !res.Found {
		out["note"] = "không thấy ở mức khớp này – box là chỗ giống nhất. Thử threshold thấp hơn, matchMode edge, hoặc capture_template lại"
	}
	return ok(out)
}

func (s *Server) mousePosition(context.Context, *mcp.CallToolRequest, struct{}) (*mcp.CallToolResult, any, error) {
	x, y := s.back.MousePosition()
	out := map[string]any{"x": x, "y": y}
	for _, d := range s.back.Displays() {
		if x >= d.X && x < d.X+d.W && y >= d.Y && y < d.Y+d.H {
			out["display"] = d
			break
		}
	}
	return ok(out)
}

func (s *Server) listWindows(context.Context, *mcp.CallToolRequest, struct{}) (*mcp.CallToolResult, any, error) {
	ws, err := s.back.Windows()
	if err != nil {
		return fail(err)
	}
	out := map[string]any{"windows": ws[:min(len(ws), maxWindows)]}
	if len(ws) > maxWindows {
		out["omitted"] = len(ws) - maxWindows
	}
	return ok(out)
}

// resolveTemplates thay "tpl:N" trong ảnh mẫu của node / điều kiện / case bằng ảnh thật (kèm templateScale cho node).
func (s *Server) resolveTemplates(sc *model.Script) error {
	var err error
	var cond func(c *model.Cond)
	cond = func(c *model.Cond) {
		if c == nil || err != nil {
			return
		}
		if strings.HasPrefix(c.Template, tplRef) {
			var t capturedTpl
			if t, err = s.tpls.get(c.Template); err == nil {
				c.Template, c.TemplateScale = t.png, t.scale
			}
		}
		for i := range c.Conds {
			cond(&c.Conds[i])
		}
	}
	for i := range sc.Steps {
		st := &sc.Steps[i]
		if strings.HasPrefix(st.Template, tplRef) && err == nil {
			var t capturedTpl
			if t, err = s.tpls.get(st.Template); err == nil {
				st.Template, st.TemplateScale = t.png, t.scale
			}
		}
		cond(st.Cond)
		for j := range st.Cases {
			cond(st.Cases[j].Cond)
		}
	}
	return err
}
