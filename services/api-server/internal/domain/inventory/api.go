package inventory

import "errors"

var (
	ErrInvalidAPIName  = errors.New("invalid api name")
	ErrUnknownAPIType  = errors.New("unknown component api type")
	ErrInvalidExposure = errors.New("unknown network exposure: available exposures: 'internal', 'internet'")
)

type APIType string
type APIRole string
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
	APITypeEventStream    APIType = "event"
	APITypeTopic          APIType = "topic"
	APITypeExchange       APIType = "exchange"
	APITypeQueue          APIType = "queue"
	APITypeNativeProtocol APIType = "native-protocol"

	APIRoleProvider APIRole = "provider"
	APIRoleConsumer APIRole = "consumer"

	NetworkExposureInternal NetworkExposure = "internal"
	NetworkExposureInternet NetworkExposure = "internet"
)

type API struct {
	id       int64
	name     string
	exposure NetworkExposure
	apiType  APIType
}

func NewAPI(
	name string,
	apiType APIType,
	exposure NetworkExposure,
) (API, error) {
	if name == "" {
		return API{}, ErrInvalidAPIName
	}
	if !isValidAPIType(apiType) {
		return API{}, ErrUnknownAPIType
	}

	if exposure != NetworkExposureInternal && exposure != NetworkExposureInternet {
		return API{}, ErrInvalidExposure
	}
	return API{
		name:     name,
		apiType:  apiType,
		exposure: exposure,
	}, nil
}

func (a *API) ID() int64 {
	return a.id
}
func (a *API) Name() string {
	return a.name
}
func (a *API) Exposure() NetworkExposure {
	return a.exposure
}
func (a *API) APIType() APIType {
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
		APITypeEventStream,
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
) API {
	return API{
		id:       id,
		name:     name,
		exposure: exposure,
		apiType:  apiType,
	}
}
