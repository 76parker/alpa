package logger

import (
	"errors"
	"io"
	"log/slog"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/lmittmann/tint"
	"gopkg.in/natefinch/lumberjack.v2"
)

var (
	ErrUnknownLevel = errors.New("unknown log level")
)

type SlogConfig struct {
	Level        string   `yaml:"level" validate:"required"`
	OnlyStdout   bool     `yaml:"only_stdout"`
	LogFile      string   `yaml:"log_file"`
	EnableCaller bool     `yaml:"enable_caller"`
	Rotation     Rotation `yaml:"rotation"`
}

type Rotation struct {
	MaxSizeMB  int  `yaml:"max_size_mb"`
	MaxAgeDays int  `yaml:"max_age_days"`
	MaxBackups int  `yaml:"max_backups"`
	LocalTime  bool `yaml:"local_time"`
	Compress   bool `yaml:"compress"`
}

type Logger interface {
	Warn(msg string, keysAndValues ...any)
	Info(msg string, keysAndValues ...any)
	Error(msg string, keysAndValues ...any)
	Debug(msg string, keysAndValues ...any)
	With(keysAndValues ...any) Logger
	WithGroup(name string) Logger
}

type Slog struct {
	onlyStdout bool
	closer     io.Closer
	closeOnce  *sync.Once
	slog       *slog.Logger
}

func NewSlog(cfg SlogConfig) (*Slog, error) {
	lvl, ok := stringToLevel(cfg.Level)
	if !ok {
		return nil, ErrUnknownLevel
	}
	consoleHandler := consoleHandler(cfg.EnableCaller, lvl)
	if cfg.OnlyStdout {
		s := slog.New(consoleHandler)
		return &Slog{
			onlyStdout: true,
			closer:     nil,
			closeOnce:  &sync.Once{},
			slog:       s,
		}, nil
	}
	fileHandler, closer, err := fileHandler(cfg.LogFile, cfg.EnableCaller, lvl, cfg.Rotation)
	if err != nil {
		return nil, err
	}
	multiHandler := slog.NewMultiHandler(fileHandler, consoleHandler)
	s := slog.New(multiHandler)
	return &Slog{
		onlyStdout: false,
		closer:     closer,
		closeOnce:  &sync.Once{},
		slog:       s,
	}, nil
}

func (l *Slog) Info(msg string, args ...any) {
	l.slog.Info(msg, args...)
}
func (l *Slog) Error(msg string, args ...any) {
	l.slog.Error(msg, args...)
}
func (l *Slog) Debug(msg string, args ...any) {
	l.slog.Debug(msg, args...)
}
func (l *Slog) Warn(msg string, args ...any) {
	l.slog.Warn(msg, args...)
}

func (l *Slog) With(args ...any) Logger {
	return &Slog{
		onlyStdout: l.onlyStdout,
		closer:     l.closer,
		closeOnce:  l.closeOnce,
		slog:       l.slog.With(args...),
	}
}

func (l *Slog) WithGroup(name string) Logger {
	return &Slog{
		onlyStdout: l.onlyStdout,
		closer:     l.closer,
		closeOnce:  l.closeOnce,
		slog:       l.slog.WithGroup(name),
	}
}

func (l *Slog) Close() error {
	if l.closer == nil {
		return nil
	}
	var closeErr error
	l.closeOnce.Do(func() {
		closeErr = l.closer.Close()
	})
	return closeErr
}

func consoleHandler(enableCaller bool, level slog.Level) slog.Handler {
	return tint.NewTextHandler(os.Stdout, &tint.Options{
		AddSource:  enableCaller,
		Level:      level,
		TimeFormat: time.DateTime,
	})
}

func fileHandler(
	fileName string,
	enableCaller bool,
	level slog.Level,
	rotation Rotation,
) (slog.Handler, io.Closer, error) {
	if fileName == "" {
		return nil, nil, errors.New("log file path is empty")
	}

	writer := &lumberjack.Logger{
		Filename:   fileName,
		MaxSize:    rotation.MaxSizeMB,  // megabytes
		MaxAge:     rotation.MaxAgeDays, // days
		MaxBackups: rotation.MaxBackups,
		LocalTime:  rotation.LocalTime,
		Compress:   rotation.Compress,
	}

	handler := slog.NewJSONHandler(writer, &slog.HandlerOptions{
		AddSource: enableCaller,
		Level:     level,
		ReplaceAttr: func(_ []string, a slog.Attr) slog.Attr {
			if a.Key == slog.TimeKey && a.Value.Kind() == slog.KindTime {
				return slog.String(slog.TimeKey, a.Value.Time().Format(time.DateTime))
			}
			return a
		},
	})

	return handler, writer, nil
}

func stringToLevel(s string) (slog.Level, bool) {
	levelMap := map[string]slog.Level{
		"debug": slog.LevelDebug,
		"info":  slog.LevelInfo,
		"warn":  slog.LevelWarn,
		"error": slog.LevelError,
	}
	level, ok := levelMap[strings.ToLower(s)]
	return level, ok
}
