package taskbadge

import (
	"sync"
	"testing"
	"time"
)

func TestRenderIcon(t *testing.T) {
	if renderIcon(None, 0) != nil {
		t.Fatal("None phải không có icon")
	}
	for _, k := range []Kind{Running, Done, Failed} {
		buf := renderIcon(k, 0)
		if len(buf) != iconSize*iconSize*4 {
			t.Fatalf("kind %d: cỡ buffer %d", k, len(buf))
		}
		if buf[3] != 0 { // góc trên trái nằm ngoài hình tròn
			t.Errorf("kind %d: góc phải trong suốt", k)
		}
		mid := (iconSize/2*iconSize + 2) * 4 // sát mép trái giữa – trong hình tròn, ngoài nét trắng
		if buf[mid+3] != 255 {
			t.Errorf("kind %d: nền hình tròn phải đặc, alpha=%d", k, buf[mid+3])
		}
	}
	// vòng xoay đổi theo frame
	if string(renderIcon(Running, 0)) == string(renderIcon(Running, 3)) {
		t.Error("các frame vòng xoay phải khác nhau")
	}
}

func TestDoneClearsAfterTimeout(t *testing.T) {
	var mu sync.Mutex
	var got []Kind
	old := apply
	apply = func(k Kind) { mu.Lock(); got = append(got, k); mu.Unlock() }
	defer func() { apply = old }()

	Set(Running)
	Set(Done)
	time.Sleep(DoneFor + 300*time.Millisecond)
	mu.Lock()
	defer mu.Unlock()
	want := []Kind{Running, Done, None}
	if len(got) != 3 || got[0] != want[0] || got[1] != want[1] || got[2] != want[2] {
		t.Fatalf("got %v, want %v", got, want)
	}
}

func TestNewRunCancelsClear(t *testing.T) {
	var mu sync.Mutex
	var got []Kind
	old := apply
	apply = func(k Kind) { mu.Lock(); got = append(got, k); mu.Unlock() }
	defer func() { apply = old }()

	Set(Done)
	Set(Running) // lượt mới bắt đầu trước khi hết 3s
	time.Sleep(DoneFor + 300*time.Millisecond)
	mu.Lock()
	defer mu.Unlock()
	if last := got[len(got)-1]; last != Running {
		t.Fatalf("dấu cuối %v, want Running (hẹn giờ cũ không được xoá)", last)
	}
}
