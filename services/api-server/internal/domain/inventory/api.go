package inventory

import (
	"errors"
	"unicode"
)

var (
	ErrUnknownAPIType   = errors.New("unknown component api type")
	ErrInvalidExposure  = errors.New("unknown network exposure: available exposures: 'internal', 'internet'")
	ErrAPILimitExceeded = errors.New("api limit exceeded: max is 5")
	ErrInvalidAPIName   = errors.New("invalid api name")
)

const maxAPINameLength = 20

type ComponentAPI struct {
	id                int64
	name              string
	exposure          NetworkExposure
	apiType           APIType
	transportProtocol TransportProtocol
}

func NewComponentAPI(
	name string,
	apiType APIType,
	exposure NetworkExposure,
) (ComponentAPI, error) {
	if !isValidAPIName(name) {
		return ComponentAPI{}, ErrInvalidAPIName
	}
	if !isValidAPIType(apiType) {
		return ComponentAPI{}, ErrUnknownAPIType
	}

	if exposure != InternalExposure && exposure != InternetExposure {
		return ComponentAPI{}, ErrInvalidExposure
	}
	transportProtocol := resolveTransportProtocol[apiType]
	return ComponentAPI{
		name:              name,
		apiType:           apiType,
		transportProtocol: transportProtocol,
		exposure:          exposure,
	}, nil
}

func isValidAPIName(name string) bool {
	characterCount := 0
	for _, character := range name {
		if unicode.IsSpace(character) {
			continue
		}
		characterCount++
		if characterCount > maxAPINameLength {
			return false
		}
	}
	return characterCount > 0
}

func (a *ComponentAPI) ID() int64 {
	return a.id
}

func (a *ComponentAPI) Name() string {
	return a.name
}
func (a *ComponentAPI) Exposure() NetworkExposure {
	return a.exposure
}
func (a *ComponentAPI) APIType() APIType {
	return a.apiType
}

func (a *ComponentAPI) TransportProtocol() TransportProtocol {
	return a.transportProtocol
}

func isValidAPIType(apiType APIType) bool {
	switch apiType {
	case REST,
		GraphQL,
		GRPC,
		JSONRPC,
		SOAP,
		WebSocket,
		Odata,
		SSE,
		EventConsumer,
		Topic,
		Subject,
		Exchange,
		Queue,
		NativeProtocol,
		Database:
		return true
	default:
		return false
	}
}

func RestoreAPI(
	id int64,
	name string,
	exposure NetworkExposure,
	apiType APIType,
) ComponentAPI {
	return ComponentAPI{
		id:       id,
		name:     name,
		exposure: exposure,
		apiType:  apiType,
	}
}

func cloneStringPointer(value *string) *string {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}
