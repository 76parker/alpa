-- name: CreateAPI :one
INSERT INTO inventory.apis (
    component_id,
    name,
    api_type,
    network_exposure
) VALUES (
    $1,
    $2,
    $3,
    $4
)
RETURNING id, component_id, name, api_type, network_exposure;

-- name: BatchCreateAPIs :many
WITH input AS (
    SELECT names.name, api_types.api_type, network_exposures.network_exposure, names.ordinality
    FROM unnest(sqlc.arg('names')::TEXT[]) WITH ORDINALITY AS names(name, ordinality)
    JOIN unnest(sqlc.arg('api_types')::TEXT[]) WITH ORDINALITY AS api_types(api_type, ordinality)
        USING (ordinality)
    JOIN unnest(sqlc.arg('network_exposures')::TEXT[]) WITH ORDINALITY AS network_exposures(network_exposure, ordinality)
        USING (ordinality)
)
INSERT INTO inventory.apis (component_id, name, api_type, network_exposure)
SELECT sqlc.arg('component_id'), name, api_type, network_exposure::inventory.network_exposure
FROM input
ORDER BY ordinality
RETURNING id, component_id, name, api_type, network_exposure;

-- name: CountAPIsByComponentID :one
SELECT count(*)
FROM inventory.apis
WHERE component_id = $1;

-- name: ListAPIsByComponentIDs :many
SELECT component_id, id, name, api_type, network_exposure
FROM inventory.apis
WHERE component_id = ANY($1::BIGINT[])
ORDER BY component_id, id;
