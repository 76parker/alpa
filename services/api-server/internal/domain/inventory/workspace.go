package inventory

import "errors"

var (
	ErrInvalidWorkspaceName = errors.New("invalid workspace name")
)

type Workspace struct {
	id   int64
	name string
}

func NewWorkspace(
	name string,
) (Workspace, error) {
	if name == "" {
		return Workspace{}, ErrInvalidWorkspaceName
	}
	return Workspace{
		name: name,
	}, nil
}

func (w *Workspace) ID() int64 {
	return w.id
}

func (w *Workspace) Name() string {
	return w.name
}

func RestoreWorkspace(id int64, name string) Workspace {
	return Workspace{
		id:   id,
		name: name,
	}
}
