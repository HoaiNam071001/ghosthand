package perm

import "testing"

type fake struct {
	states   map[ID]State
	requests []ID
}

func (f *fake) IDs() []ID { return []ID{Accessibility, Notifications, AutoChrome} }
func (f *fake) Probe(id ID) (State, string) {
	if id == AutoChrome {
		return Unknown, "Chrome chưa mở"
	}
	return f.states[id], ""
}
func (f *fake) Request(id ID) (State, string) {
	f.requests = append(f.requests, id)
	f.states[id] = Granted
	return Granted, ""
}
func (f *fake) OpenSettings(ID) error { return nil }

func TestCheck(t *testing.T) {
	f := &fake{states: map[ID]State{Accessibility: Denied}}
	got := Check(f)
	if len(got) != 3 || got[0].State != Denied || got[0].Name == "" || got[0].Hint == "" {
		t.Fatalf("sai: %+v", got)
	}
	if !got[1].Manual || got[1].State != Unknown {
		t.Errorf("thông báo phải là thủ công: %+v", got[1])
	}
	if got[2].Note != "Chrome chưa mở" {
		t.Errorf("mất ghi chú: %+v", got[2])
	}
	if len(f.requests) != 0 {
		t.Error("Check không được bật hộp thoại xin quyền")
	}
}

func TestRequest(t *testing.T) {
	f := &fake{states: map[ID]State{Accessibility: Denied}}
	it, ok := Request(f, Accessibility)
	if !ok || it.State != Granted || len(f.requests) != 1 {
		t.Fatalf("sai: %+v %v", it, f.requests)
	}
	if _, ok := Request(f, "khong-co"); ok {
		t.Error("ID lạ phải bị từ chối")
	}
	if _, ok := Request(f, Notifications); !ok || len(f.requests) != 1 {
		t.Error("quyền thủ công không gọi Request")
	}
}
