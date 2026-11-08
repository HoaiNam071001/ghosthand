package textop

import "testing"

func TestNewFinder(t *testing.T) {
	cases := []struct {
		q, text string
		want    bool
	}{
		{"dang nhap", "Đăng nhập", true},
		{"ĐĂNG", "nút đăng ký", true},
		{"gửi", "Xoá", false},
		{"/^Gửi$/", "Gửi", true},
		{"/^gửi$/", "Gửi", false},
		{"/^gửi$/i", "Gửi", true},
		{"/đơn \\d+/", "Mã đơn 1234", true},
		{"/a/x", "/a/x", true}, // cờ lạ → chữ thường, không phải regex
	}
	for _, c := range cases {
		f, err := NewFinder(c.q)
		if err != nil {
			t.Fatalf("%q: %v", c.q, err)
		}
		if got := f("", c.text); got != c.want {
			t.Errorf("%q trong %q = %v, muốn %v", c.q, c.text, got, c.want)
		}
	}
	if f, err := NewFinder("  "); f != nil || err != nil {
		t.Error("find rỗng phải là không lọc")
	}
	if _, err := NewFinder("/(/"); err == nil {
		t.Error("regex sai phải báo lỗi")
	}
}
