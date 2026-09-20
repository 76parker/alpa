package inventory

type APIType string

const (
	REST           APIType = "rest"
	GraphQL        APIType = "graphql"
	GRPC           APIType = "grpc"
	JSONRPC        APIType = "json-rpc"
	SOAP           APIType = "soap"
	WebSocket      APIType = "websocket"
	Odata          APIType = "odata"
	SSE            APIType = "sse"
	EventConsumer  APIType = "event-consumer"
	Topic          APIType = "topic"
	Subject        APIType = "subject"
	Exchange       APIType = "exchange"
	Queue          APIType = "queue"
	NativeProtocol APIType = "native-protocol"
	Database       APIType = "database"
)

type TransportProtocol string

const (
	TCP    TransportProtocol = "tcp"
	UDP    TransportProtocol = "udp"
	TCPUDP TransportProtocol = "tcp/udp"
)

var resolveTransportProtocol = map[APIType]TransportProtocol{
	REST:           TCP,
	GraphQL:        TCP,
	GRPC:           TCP,
	JSONRPC:        TCP,
	SOAP:           TCP,
	WebSocket:      TCP,
	Odata:          TCP,
	SSE:            TCP,
	EventConsumer:  TCP,
	Topic:          TCP,
	Subject:        TCP,
	Exchange:       TCP,
	Queue:          TCP,
	NativeProtocol: TCPUDP,
	Database:       TCP,
}

type NetworkExposure string

const (
	InternalExposure NetworkExposure = "internal"
	InternetExposure NetworkExposure = "internet"
)
