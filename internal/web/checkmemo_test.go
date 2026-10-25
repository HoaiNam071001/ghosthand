package web

import "testing"

func TestCheckMemoLookup(t *testing.T) {
	var m checkMemo
	m.put(PageCheck{URL: "https://a.vn/x", Verdict: PageCaptcha})
	m.put(PageCheck{URL: ""}) // không URL → bỏ
	if pc, ok := m.lookup("https://a.vn/x"); !ok || pc.Verdict != PageCaptcha {
		t.Fatalf("khớp đúng URL: %+v %v", pc, ok)
	}
	if _, ok := m.lookup("https://a.vn/khac?y=1"); !ok {
		t.Error("cùng host phải khớp")
	}
	if _, ok := m.lookup("https://b.vn/x"); ok {
		t.Error("khác host không được khớp")
	}
	if _, ok := m.lookup(""); ok {
		t.Error("URL rỗng không khớp")
	}
}
