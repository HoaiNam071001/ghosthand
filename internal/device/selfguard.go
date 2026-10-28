package device

import (
	"errors"
	"fmt"
)

// Chặn lượt AI tự bấm vào chính app (học từ OpenClaw: hộp duyệt không được để AI tự bấm). Lần chạy do AI khởi động
// không được bấm / cuộn / gõ vào cửa sổ của Ghosthand – nếu không, kịch bản AI bấm được "Cho phép" trên hộp hỏi chạy,
// "Đồng ý" thao tác nguy hiểm, hay đổi mức AI trong Cài đặt. Chỉ chặn lúc nhấn (nút / phím xuống), không chặn lúc thả
// – thả bị chặn thì nút / phím kẹt.

// ErrSelfInput – thao tác của lượt AI rơi vào cửa sổ của chính app.
var ErrSelfInput = errors.New("lượt chạy của AI không được bấm / gõ vào cửa sổ Ghosthand")

// SelfGuardInput bọc Input cho lượt AI. Own: cửa sổ trên cùng tại điểm thuộc app này; OwnFront: app này đang nhận phím.
// Không hỏi được hệ điều hành thì từ chối (an toàn trước) – lỗi nói rõ lý do.
type SelfGuardInput struct {
	Input
	Own      func(x, y int) (bool, error)
	OwnFront func() (bool, error)
}

func (g *SelfGuardInput) checkPoint() error {
	x, y := g.Input.Location()
	own, err := g.Own(x, y)
	if err != nil {
		return fmt.Errorf("%w – không kiểm tra được cửa sổ dưới chuột (%v)", ErrSelfInput, err)
	}
	if own {
		return fmt.Errorf("%w (chuột đang ở %d,%d trên cửa sổ app) – chưa bấm; hỏi người dùng tự thao tác trong app", ErrSelfInput, x, y)
	}
	return nil
}

func (g *SelfGuardInput) checkFront() error {
	own, err := g.OwnFront()
	if err != nil {
		return fmt.Errorf("%w – không kiểm tra được app đang nhận phím (%v)", ErrSelfInput, err)
	}
	if own {
		return fmt.Errorf("%w (app đang ở trước, nhận phím) – chưa gõ; focus app đích trước (node Cửa sổ / Mở)", ErrSelfInput)
	}
	return nil
}

func (g *SelfGuardInput) Click(button string, double bool) error {
	if err := g.checkPoint(); err != nil {
		return err
	}
	return g.Input.Click(button, double)
}

func (g *SelfGuardInput) Toggle(button string, down bool) error {
	if down {
		if err := g.checkPoint(); err != nil {
			return err
		}
	}
	return g.Input.Toggle(button, down)
}

func (g *SelfGuardInput) Scroll(direction string) error {
	if err := g.checkPoint(); err != nil {
		return err
	}
	return g.Input.Scroll(direction)
}

func (g *SelfGuardInput) TypeStr(s string) error {
	if err := g.checkFront(); err != nil {
		return err
	}
	return g.Input.TypeStr(s)
}

func (g *SelfGuardInput) KeyToggle(key string, down bool, modifiers []string) error {
	if down {
		if err := g.checkFront(); err != nil {
			return err
		}
	}
	return g.Input.KeyToggle(key, down, modifiers)
}
