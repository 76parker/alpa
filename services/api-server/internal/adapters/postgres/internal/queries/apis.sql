-- name: CreateAPI :one
INSERT INTO inventory.apis (
    component_id,
    name,
    api_type,
    network_exposure,
    documentation_url
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5
)
RETURNING id, component_id, name, api_type, network_exposure, documentation_url;

-- name: BatchCreateAPIs :many
WITH input AS (
    SELECT names.name, api_types.api_type, network_exposures.network_exposure, documentation_urls.documentation_url, names.ordinality
    FROM unnest(sqlc.arg('names')::TEXT[]) WITH ORDINALITY AS names(name, ordinality)
    JOIN unnest(sqlc.arg('api_types')::TEXT[]) WITH ORDINALITY AS api_types(api_type, ordinality)
        USING (ordinality)
    JOIN unnest(sqlc.arg('network_exposures')::TEXT[]) WITH ORDINALITY AS network_exposures(network_exposure, ordinality)
        USING (ordinality)
    JOIN unnest(sqlc.arg('documentation_urls')::TEXT[]) WITH ORDINALITY AS documentation_urls(documentation_url, ordinality)
        USING (ordinality)
)
INSERT INTO inventory.apis (component_id, name, api_type, network_exposure, documentation_url)
SELECT sqlc.arg('component_id'), name, api_type, network_exposure::inventory.network_exposure, NULLIF(documentation_url, '')
FROM input
ORDER BY ordinality
RETURNING id, component_id, name, api_type, network_exposure, documentation_url;

-- name: CountAPIsByComponentID :one
SELECT count(*)
FROM inventory.apis
WHERE component_id = $1;

-- name: UpdateAPI :one
UPDATE inventory.apis
SET name = sqlc.arg('name'),
    api_type = sqlc.arg('api_type'),
    network_exposure = sqlc.arg('network_exposure'),
    documentation_url = sqlc.arg('documentation_url')
WHERE id = sqlc.arg('api_id')
  AND component_id = sqlc.arg('component_id')
RETURNING id, component_id, name, api_type, network_exposure, documentation_url;

-- name: DeleteAPI :one
DELETE FROM inventory.apis
WHERE id = sqlc.arg('api_id')
  AND component_id = sqlc.arg('component_id')
RETURNING id;

-- name: ListAPIsByComponentIDs :many
SELECT component_id, id, name, api_type, network_exposure, documentation_url
FROM inventory.apis
WHERE component_id = ANY($1::BIGINT[])
ORDER BY component_id, id;
