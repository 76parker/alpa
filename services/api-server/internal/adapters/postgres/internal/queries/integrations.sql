-- name: GetIntegrationClientForShare :one
SELECT
    client.id,
    client.client_name,
    client.communication_type,
    client.capabilities,
    client.secure_connection,
    component.id AS component_id,
    component.product_id
FROM inventory.component_clients AS client
JOIN inventory.components AS component ON component.id = client.component_id
WHERE client.id = sqlc.arg('client_id')
FOR SHARE OF client, component;

-- name: GetIntegrationAPIForShare :one
SELECT
    api.id,
    component.id AS component_id,
    component.product_id
FROM inventory.apis AS api
JOIN inventory.components AS component ON component.id = api.component_id
WHERE api.id = sqlc.arg('api_id')
FOR SHARE OF api, component;

-- name: CreateIntegration :one
INSERT INTO inventory.client_integrations (client_id, api_id, action, description)
VALUES (sqlc.arg('client_id'), sqlc.arg('api_id'), sqlc.arg('action'), sqlc.arg('description'))
RETURNING id, client_id, api_id, action, description;

-- name: GetIntegrationForUpdate :one
SELECT id, client_id, api_id, action, description
FROM inventory.client_integrations
WHERE id = sqlc.arg('integration_id')
FOR UPDATE;

-- name: UpdateIntegrationDescription :one
UPDATE inventory.client_integrations
SET description = sqlc.arg('description')
WHERE id = sqlc.arg('integration_id')
RETURNING id, client_id, api_id, action, description;

-- name: DeleteIntegration :one
DELETE FROM inventory.client_integrations
WHERE id = sqlc.arg('integration_id')
RETURNING id;

-- name: ListIntegrationsByClientIDs :many
SELECT id, client_id, api_id, action, description
FROM inventory.client_integrations
WHERE client_id = ANY(sqlc.arg('client_ids')::BIGINT[])
ORDER BY client_id, id;
