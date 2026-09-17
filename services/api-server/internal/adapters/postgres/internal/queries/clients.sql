-- name: CreateClient :one
INSERT INTO inventory.component_clients (
    component_id,
    client_name,
    role,
    communication_type,
    description
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5
)
RETURNING id, component_id, client_name, role, communication_type, description, api_id;

-- name: BatchCreateClients :many
WITH input AS (
    SELECT client_names.client_name, roles.role, communication_types.communication_type, descriptions.description, client_names.ordinality
    FROM unnest(sqlc.arg('client_names')::TEXT[]) WITH ORDINALITY AS client_names(client_name, ordinality)
    JOIN unnest(sqlc.arg('roles')::TEXT[]) WITH ORDINALITY AS roles(role, ordinality)
        USING (ordinality)
    JOIN unnest(sqlc.arg('communication_types')::TEXT[]) WITH ORDINALITY AS communication_types(communication_type, ordinality)
        USING (ordinality)
    JOIN unnest(sqlc.arg('descriptions')::TEXT[]) WITH ORDINALITY AS descriptions(description, ordinality)
        USING (ordinality)
)
INSERT INTO inventory.component_clients (
    component_id,
    client_name,
    role,
    communication_type,
    description
)
SELECT sqlc.arg('component_id'), client_name, role, communication_type, description
FROM input
ORDER BY ordinality
RETURNING id, component_id, client_name, role, communication_type, description, api_id;

-- name: CountClientsByComponentID :one
SELECT count(*)
FROM inventory.component_clients
WHERE component_id = $1;

-- name: ListClientsByComponentIDs :many
SELECT
    component_clients.component_id,
    component_clients.id,
    component_clients.client_name,
    component_clients.role,
    component_clients.communication_type,
    component_clients.description,
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
RETURNING id, component_id, client_name, role, communication_type, description, api_id;
