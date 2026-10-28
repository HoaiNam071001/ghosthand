package device

import (
	"errors"
	"slices"
	"testing"

	"ghosthand/internal/device/devicetest"
	"ghosthand/internal/model"
)

// Cửa sổ app ở (0,0)–(400,300): lượt AI không được nhấn / cuộn / gõ vào đó; thả nút / phím vẫn cho (không kẹt).
func TestSelfGuardInput(t *testing.T) {
	app := model.Rect{W: 400, H: 300}
	front := false
	fake := &devicetest.FakeInput{}
	g := &SelfGuardInput{Input: fake,
		Own:      func(x, y int) (bool, error) { return x >= app.X && x < app.X+app.W && y >= app.Y && y < app.Y+app.H, nil },
		OwnFront: func() (bool, error) { return front, nil }}

	g.Move(100, 100)
	for name, err := range map[string]error{
		"click":  g.Click("left", false),
		"press":  g.Toggle("left", true),
		"scroll": g.Scroll("down"),
	} {
		if !errors.Is(err, ErrSelfInput) {
			t.Errorf("%s trên cửa sổ app: err = %v, muốn ErrSelfInput", name, err)
		}
	}
	if err := g.Toggle("left", false); err != nil {
		t.Errorf("thả nút phải được: %v", err)
	}

	g.Move(800, 600)
	if err := g.Click("left", false); err != nil {
		t.Errorf("click ngoài app: %v", err)
	}

	front = true
	if err := g.TypeStr("ok"); !errors.Is(err, ErrSelfInput) {
		t.Errorf("gõ khi app ở trước: err = %v", err)
	}
	if err := g.KeyToggle("enter", true, nil); !errors.Is(err, ErrSelfInput) {
		t.Errorf("nhấn phím khi app ở trước: err = %v", err)
	}
	if err := g.KeyToggle("enter", false, nil); err != nil {
		t.Errorf("thả phím phải được: %v", err)
	}
	front = false
	if err := g.TypeStr("ok"); err != nil {
		t.Errorf("gõ khi app khác ở trước: %v", err)
	}

	want := []string{"move 100,100", "toggle left false", "move 800,600", "click left false", "up enter", "type ok"}
	if got := fake.Lines(); !slices.Equal(got, want) {
		t.Errorf("thao tác thật = %q, muốn %q", got, want)
	}
}

// Không hỏi được hệ điều hành → từ chối (an toàn trước).
func TestSelfGuardInputFailsClosed(t *testing.T) {
	boom := errors.New("boom")
	g := &SelfGuardInput{Input: &devicetest.FakeInput{},
		Own:      func(int, int) (bool, error) { return false, boom },
		OwnFront: func() (bool, error) { return false, boom }}
	if err := g.Click("left", false); !errors.Is(err, ErrSelfInput) {
		t.Errorf("click: err = %v", err)
	}
	if err := g.TypeStr("x"); !errors.Is(err, ErrSelfInput) {
		t.Errorf("gõ: err = %v", err)
	}
}
