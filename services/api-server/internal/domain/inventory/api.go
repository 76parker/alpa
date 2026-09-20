package inventory

import "errors"

var (
	ErrInvalidAPIName   = errors.New("invalid api name")
	ErrUnknownAPIType   = errors.New("unknown component api type")
	ErrInvalidExposure  = errors.New("unknown network exposure: available exposures: 'internal', 'internet'")
	ErrAPILimitExceeded = errors.New("api limit exceeded: max is 5")
)

type ComponentAPI struct {
	id                int64
	name              string
	exposure          NetworkExposure
	apiType           APIType
	transportProtocol TransportProtocol
	documentationURL  *string
}

func NewComponentAPI(
	name string,
	apiType APIType,
	exposure NetworkExposure,
	documentationURL *string,
) (ComponentAPI, error) {
	if name == "" {
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
		documentationURL:  cloneStringPointer(documentationURL),
	}, nil
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

func (a *ComponentAPI) DocumentationURL() *string {
	return a.documentationURL
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
	documentationURL *string,
) ComponentAPI {
	return ComponentAPI{
		id:               id,
		name:             name,
		exposure:         exposure,
		apiType:          apiType,
		documentationURL: cloneStringPointer(documentationURL),
	}
}

func cloneStringPointer(value *string) *string {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}
