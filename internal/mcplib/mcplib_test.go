package mcplib_test

import (
	"errors"
	"strings"
	"testing"

	"ghosthand/internal/mcplib"
	"ghosthand/internal/store"
)

func TestEntriesAreValidServers(t *testing.T) {
	seen := map[string]bool{}
	for _, e := range mcplib.Entries(func(string) (string, error) { return "", nil }) {
		if seen[e.ID] {
			t.Errorf("trùng id %s", e.ID)
		}
		seen[e.ID] = true
		vals := map[string]string{}
		for _, p := range e.Params {
			vals[p.Key] = "/tmp/x"
		}
		s := store.MCPServer{ID: e.ID, Name: e.Name, Kind: e.Kind, Command: e.Command, URL: mcplib.Fill(e.URL, vals), Headers: e.Headers, Enabled: true}
		for _, a := range e.Args {
			s.Args = append(s.Args, mcplib.Fill(a, vals))
		}
		if err := s.Check(); err != nil {
			t.Errorf("%s: %v", e.ID, err)
		}
		for _, a := range s.Args {
			if strings.Contains(a, "${") {
				t.Errorf("%s: còn tham số chưa có Param: %s", e.ID, a)
			}
		}
	}
}

func TestAvailability(t *testing.T) {
	look := func(n string) (string, error) {
		if n == "npx" {
			return "/usr/bin/npx", nil
		}
		return "", errors.New("no")
	}
	for _, e := range mcplib.Entries(look) {
		switch e.Needs {
		case "npx":
			if !e.Available {
				t.Errorf("%s: có npx mà báo thiếu", e.ID)
			}
		case "uvx":
			if e.Available || e.InstallHint == "" {
				t.Errorf("%s: thiếu uvx phải báo + có hướng dẫn", e.ID)
			}
		}
	}
}
