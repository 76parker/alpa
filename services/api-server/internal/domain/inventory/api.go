package inventory

import "errors"

var (
	ErrInvalidAPIName  = errors.New("invalid api name")
	ErrUnknownAPIType  = errors.New("unknown component api type")
	ErrInvalidExposure = errors.New("unknown network exposure: available exposures: 'internal', 'internet'")
	ErrAPILimitExceeded = errors.New("api limit exceeded: max is 5")
)

type APIType string
type NetworkExposure string

const (
	APITypeREST           APIType = "rest"
	APITypeGraphQL        APIType = "graphql"
	APITypeGRPC           APIType = "grpc"
	APITypeJSONRPC        APIType = "json-rpc"
	APITypeSOAP           APIType = "soap"
	APITypeWebSocket      APIType = "websocket"
	APITypeOdata          APIType = "odata"
	APITypeSSE            APIType = "sse"
	APITypeEventConsumer  APIType = "event-consumer"
	APITypeTopic          APIType = "topic"
	APITypeExchange       APIType = "exchange"
	APITypeQueue          APIType = "queue"
	APITypeNativeProtocol APIType = "native-protocol"

	NetworkExposureInternal NetworkExposure = "internal"
	NetworkExposureInternet NetworkExposure = "internet"
)

type ComponentAPI struct {
	id       int64
	name     string
	exposure NetworkExposure
	apiType  APIType
}

func NewComponentAPI(
	name string,
	apiType APIType,
	exposure NetworkExposure,
) (ComponentAPI, error) {
	if name == "" {
		return ComponentAPI{}, ErrInvalidAPIName
	}
	if !isValidAPIType(apiType) {
		return ComponentAPI{}, ErrUnknownAPIType
	}

	if exposure != NetworkExposureInternal && exposure != NetworkExposureInternet {
		return ComponentAPI{}, ErrInvalidExposure
	}
	return ComponentAPI{
		name:     name,
		apiType:  apiType,
		exposure: exposure,
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

func isValidAPIType(apiType APIType) bool {
	switch apiType {
	case APITypeREST,
		APITypeGraphQL,
		APITypeGRPC,
		APITypeJSONRPC,
		APITypeSOAP,
		APITypeWebSocket,
		APITypeOdata,
		APITypeSSE,
		APITypeEventConsumer,
		APITypeTopic,
		APITypeExchange,
		APITypeQueue,
		APITypeNativeProtocol:
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
