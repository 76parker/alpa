-- name: CreateClient :one
INSERT INTO inventory.component_clients (
    component_id,
    client_name,
    role,
    communication_type,
    action,
    capabilities,
    secure_connection
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7
)
RETURNING id, component_id, client_name, role, communication_type, action, capabilities, secure_connection, api_id;

-- name: BatchCreateClients :many
WITH input AS (
    SELECT client_names.client_name, roles.role, communication_types.communication_type, actions.action, capabilities.capabilities, secure_connections.secure_connection, client_names.ordinality
    FROM unnest(sqlc.arg('client_names')::TEXT[]) WITH ORDINALITY AS client_names(client_name, ordinality)
    JOIN unnest(sqlc.arg('roles')::TEXT[]) WITH ORDINALITY AS roles(role, ordinality)
        USING (ordinality)
    JOIN unnest(sqlc.arg('communication_types')::TEXT[]) WITH ORDINALITY AS communication_types(communication_type, ordinality)
        USING (ordinality)
    JOIN unnest(sqlc.arg('actions')::TEXT[]) WITH ORDINALITY AS actions(action, ordinality)
        USING (ordinality)
    JOIN unnest(sqlc.arg('capabilities')::TEXT[]) WITH ORDINALITY AS capabilities(capabilities, ordinality)
        USING (ordinality)
    JOIN unnest(sqlc.arg('secure_connections')::BOOLEAN[]) WITH ORDINALITY AS secure_connections(secure_connection, ordinality)
        USING (ordinality)
)
INSERT INTO inventory.component_clients (
    component_id,
    client_name,
    role,
    communication_type,
    action,
    capabilities,
    secure_connection
)
SELECT sqlc.arg('component_id'), client_name, role, communication_type, NULLIF(action, ''), NULLIF(capabilities, ''), secure_connection
FROM input
ORDER BY ordinality
RETURNING id, component_id, client_name, role, communication_type, action, capabilities, secure_connection, api_id;

-- name: CountClientsByComponentID :one
SELECT count(*)
FROM inventory.component_clients
WHERE component_id = $1;

-- name: UpdateClient :one
UPDATE inventory.component_clients
SET client_name = sqlc.arg('client_name'),
    role = sqlc.arg('role'),
    communication_type = sqlc.arg('communication_type'),
    action = sqlc.arg('action'),
    capabilities = sqlc.arg('capabilities'),
    secure_connection = sqlc.arg('secure_connection')
WHERE id = sqlc.arg('client_id')
  AND component_id = sqlc.arg('component_id')
RETURNING id, component_id, client_name, role, communication_type, action, capabilities, secure_connection, api_id;

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
    component_clients.role,
    component_clients.communication_type,
    component_clients.action,
    component_clients.capabilities,
    component_clients.secure_connection,
    component_clients.api_id
FROM inventory.component_clients
WHERE component_clients.component_id = ANY($1::BIGINT[])
ORDER BY component_clients.component_id, component_clients.id;

-- name: GetClientForAPIUpdate :one
SELECT
    source_client.id AS client_id,
    source_component.id AS component_id,
    source_component.product_id,
    source_client.api_id
FROM inventory.component_clients AS source_client
JOIN inventory.components AS source_component
    ON source_component.id = source_client.component_id
WHERE source_client.id = sqlc.arg('client_id')
  AND source_component.id = sqlc.arg('component_id')
FOR UPDATE OF source_client
FOR SHARE OF source_component;

-- name: GetTargetAPIForShare :one
SELECT
    target_api.id AS api_id,
    target_component.id AS component_id,
    target_component.product_id
FROM inventory.apis AS target_api
JOIN inventory.components AS target_component
    ON target_component.id = target_api.component_id
WHERE target_api.id = sqlc.arg('api_id')
FOR SHARE OF target_api, target_component;

-- name: BindClientAPI :one
UPDATE inventory.component_clients
SET api_id = sqlc.arg('api_id')
WHERE id = sqlc.arg('client_id')
  AND api_id IS NULL
RETURNING id, component_id, client_name, role, communication_type, action, capabilities, secure_connection, api_id;
