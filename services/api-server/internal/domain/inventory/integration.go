package inventory

import (
	"errors"
	"unicode/utf8"
)

const maxIntegrationDescriptionCharacters = 1000

var (
	ErrInvalidClientAction            = errors.New("invalid client action")
	ErrInvalidIntegration             = errors.New("invalid integration")
	ErrInvalidIntegrationDescription  = errors.New("invalid integration description")
	ErrIntegrationAlreadyExists       = errors.New("integration already exists")
	ErrIncompatibleClientIntegrations = errors.New("client has incompatible integrations")
)

type ClientAction string

const (
	Consume      ClientAction = "consume"
	Produce      ClientAction = "produce"
	Call         ClientAction = "call"
	ListenEvents ClientAction = "listen-events"
	Proxy        ClientAction = "proxy"
)

type Integration struct {
	id          int64
	clientID    int64
	apiID       int64
	action      ClientAction
	description *string
}

func NewIntegration(clientID, apiID int64, action ClientAction, description *string) (Integration, error) {
	if clientID <= 0 || apiID <= 0 {
		return Integration{}, ErrNegativeID
	}
	if !isValidClientAction(action) {
		return Integration{}, ErrInvalidClientAction
	}
	if err := validateIntegrationDescription(description); err != nil {
		return Integration{}, err
	}
	return Integration{
		clientID:    clientID,
		apiID:       apiID,
		action:      action,
		description: cloneStringPointer(description),
	}, nil
}

func RestoreIntegration(id, clientID, apiID int64, action ClientAction, description *string) Integration {
	return Integration{
		id:          id,
		clientID:    clientID,
		apiID:       apiID,
		action:      action,
		description: cloneStringPointer(description),
	}
}

func (i *Integration) ID() int64 {
	return i.id
}

func (i *Integration) ClientID() int64 {
	return i.clientID
}

func (i *Integration) APIID() int64 {
	return i.apiID
}

func (i *Integration) Action() ClientAction {
	return i.action
}

func (i *Integration) Description() *string {
	return cloneStringPointer(i.description)
}

func (i *Integration) UpdateDescription(description *string) error {
	if err := validateIntegrationDescription(description); err != nil {
		return err
	}
	i.description = cloneStringPointer(description)
	return nil
}

func isValidClientAction(action ClientAction) bool {
	switch action {
	case Consume, Produce, Call, ListenEvents:
		return true
	default:
		return false
	}
}

func validateIntegrationDescription(description *string) error {
	if description == nil {
		return nil
	}
	if !utf8.ValidString(*description) {
		return ErrInvalidIntegrationDescription
	}
	length := utf8.RuneCountInString(*description)
	if length == 0 || length > maxIntegrationDescriptionCharacters {
		return ErrInvalidIntegrationDescription
	}
	return nil
}
