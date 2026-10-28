//go:build !windows

package mcpclient

import "os/exec"

func hideWindow(*exec.Cmd) {}
