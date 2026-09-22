-- name: CreateClient :one
INSERT INTO inventory.component_clients (
    component_id,
    client_name,
    communication_type,
    capabilities,
    secure_connection
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5
)
RETURNING id, component_id, client_name, communication_type, capabilities, secure_connection;

-- name: BatchCreateClients :many
WITH input AS (
    SELECT client_names.client_name, communication_types.communication_type, capabilities.capabilities, secure_connections.secure_connection, client_names.ordinality
    FROM unnest(sqlc.arg('client_names')::TEXT[]) WITH ORDINALITY AS client_names(client_name, ordinality)
    JOIN unnest(sqlc.arg('communication_types')::TEXT[]) WITH ORDINALITY AS communication_types(communication_type, ordinality)
        USING (ordinality)
    JOIN unnest(sqlc.arg('capabilities')::TEXT[]) WITH ORDINALITY AS capabilities(capabilities, ordinality)
        USING (ordinality)
    JOIN unnest(sqlc.arg('secure_connections')::BOOLEAN[]) WITH ORDINALITY AS secure_connections(secure_connection, ordinality)
        USING (ordinality)
)
INSERT INTO inventory.component_clients (
    component_id,
    client_name,
    communication_type,
    capabilities,
    secure_connection
)
SELECT sqlc.arg('component_id'), client_name, communication_type, NULLIF(capabilities, ''), secure_connection
FROM input
ORDER BY ordinality
RETURNING id, component_id, client_name, communication_type, capabilities, secure_connection;

-- name: CountClientsByComponentID :one
SELECT count(*)
FROM inventory.component_clients
WHERE component_id = $1;

-- name: UpdateClient :one
UPDATE inventory.component_clients
SET client_name = sqlc.arg('client_name'),
    communication_type = sqlc.arg('communication_type'),
    capabilities = sqlc.arg('capabilities'),
    secure_connection = sqlc.arg('secure_connection')
WHERE id = sqlc.arg('client_id')
  AND component_id = sqlc.arg('component_id')
RETURNING id, component_id, client_name, communication_type, capabilities, secure_connection;

-- name: DeleteClient :one
DELETE FROM inventory.component_clients
WHERE id = sqlc.arg('client_id')
  AND component_id = sqlc.arg('component_id')
RETURNING id;

-- name: ListClientsByComponentIDs :many
SELECT
    component_clients.component_id,
    component_clients.id,
    component_clients.client_name,
    component_clients.communication_type,
    component_clients.capabilities,
    component_clients.secure_connection
FROM inventory.component_clients
WHERE component_clients.component_id = ANY($1::BIGINT[])
ORDER BY component_clients.component_id, component_clients.id;
