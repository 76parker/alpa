package logger

import (
	"log/slog"
	"os"
)

type MockLogger struct {
	Slog *slog.Logger
}

func NewMockLogger() *MockLogger {

	h := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{})
	return &MockLogger{
		Slog: slog.New(h),
	}
}

func (l *MockLogger) Info(msg string, args ...any) {
	l.Slog.Info(msg, args...)
}
func (l *MockLogger) Error(msg string, args ...any) {
	l.Slog.Error(msg, args...)
}
func (l *MockLogger) Debug(msg string, args ...any) {
	l.Slog.Debug(msg, args...)
}
func (l *MockLogger) Warn(msg string, args ...any) {
	l.Slog.Warn(msg, args...)
}

func (l *MockLogger) With(args ...any) Logger {
	return &MockLogger{
		Slog: l.Slog.With(args...),
	}
}
func (l *MockLogger) WithGroup(name string) Logger {
	return &MockLogger{
		Slog: l.Slog.WithGroup(name),
	}
}
