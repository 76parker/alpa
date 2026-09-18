package inventory

import (
	"errors"
	"testing"
)

func TestNewInfrastructureComponentDetails(t *testing.T) {
	t.Parallel()

	// Every declared technology must be accepted so the public catalog and domain validation cannot drift.
	for _, technology := range []InfrastructureTechnology{
		InfrastructureTechnologyPostgreSQL,
		InfrastructureTechnologyMySQL,
		InfrastructureTechnologyMariaDB,
		InfrastructureTechnologyMongoDB,
		InfrastructureTechnologyCassandra,
		InfrastructureTechnologyClickHouse,
		InfrastructureTechnologyRedis,
		InfrastructureTechnologyMemcached,
		InfrastructureTechnologyEtcd,
		InfrastructureTechnologyKafka,
		InfrastructureTechnologyRabbitMQ,
		InfrastructureTechnologyNATS,
		InfrastructureTechnologyPulsar,
		InfrastructureTechnologyElasticsearch,
		InfrastructureTechnologyOpenSearch,
		InfrastructureTechnologyS3,
		InfrastructureTechnologyMinIO,
		InfrastructureTechnologyCeph,
		InfrastructureTechnologyTemporal,
		InfrastructureTechnologyAirflow,
		InfrastructureTechnologyArgo,
		InfrastructureTechnologyNginx,
		InfrastructureTechnologyEnvoy,
		InfrastructureTechnologyKong,
		InfrastructureTechnologyTraefik,
		InfrastructureTechnologyHAProxy,
		InfrastructureTechnologyPrometheus,
		InfrastructureTechnologyGrafana,
		InfrastructureTechnologyZabbix,
		InfrastructureTechnologyJaeger,
		InfrastructureTechnologyZipkin,
		InfrastructureTechnologyOpenTelemetry,
		InfrastructureTechnologyKeycloak,
		InfrastructureTechnologyVault,
	} {
		t.Run("valid technology/"+string(technology), func(t *testing.T) {
			endpoints := []string{"primary:5432"}
			details, err := NewInfrastructureComponentDetails(
				technology,
				SystemTypeSQLDatabase,
				"17",
				endpoints,
			)
			if err != nil {
				t.Fatalf("create details: %v", err)
			}
			endpoints[0] = "changed:5432"
			if got := details.Endpoints; len(got) != 1 || got[0] != "primary:5432" {
				t.Fatalf("endpoints = %v, want independent copy [primary:5432]", got)
			}
		})
	}

	// Every system type is valid independently from the technology; no compatibility matrix is part of this contract.
	for _, systemType := range []SystemType{
		SystemTypeMessageBroker,
		SystemTypeSQLDatabase,
		SystemTypeNoSQLDatabase,
		SystemTypeCache,
		SystemTypeSearchEngine,
		SystemTypeObjectStorage,
		SystemTypeWorkflowEngine,
		SystemTypeServiceMesh,
		SystemTypeAPIGateway,
		SystemTypeLoadBalancer,
		SystemTypeIdentityProvider,
		SystemTypeSecretStorage,
		SystemTypeMonitoring,
		SystemTypeLogging,
		SystemTypeTracing,
	} {
		t.Run("valid system type/"+string(systemType), func(t *testing.T) {
			_, err := NewInfrastructureComponentDetails(
				InfrastructureTechnologyPostgreSQL,
				systemType,
				"",
				nil,
			)
			if err != nil {
				t.Fatalf("create details: %v", err)
			}
		})
	}

	// Unknown values and endpoint-limit violations must expose stable, specific errors to the HTTP layer.
	tests := []struct {
		name       string
		technology InfrastructureTechnology
		systemType SystemType
		endpoints  []string
		wantErr    error
	}{
		{
			name:       "unknown technology",
			technology: "postgres",
			systemType: SystemTypeSQLDatabase,
			wantErr:    ErrUnknownInfrastructureTechnology,
		},
		{
			name:       "legacy system type",
			technology: InfrastructureTechnologyPostgreSQL,
			systemType: "queue/stream",
			wantErr:    ErrUnknownSystemType,
		},
		{
			name:       "eleven endpoints",
			technology: InfrastructureTechnologyPostgreSQL,
			systemType: SystemTypeSQLDatabase,
			endpoints:  make([]string, 11),
			wantErr:    ErrTooManyEndpoints,
		},
	}
	for _, tc := range tests {
		t.Run("invalid/"+tc.name, func(t *testing.T) {
			_, err := NewInfrastructureComponentDetails(tc.technology, tc.systemType, "", tc.endpoints)
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("error = %v, want %v", err, tc.wantErr)
			}
		})
	}
}
