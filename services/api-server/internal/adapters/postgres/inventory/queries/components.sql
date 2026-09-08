-- name: CreateComponent :one
INSERT INTO inventory.components (
    product_id,
    name,
    description,
    component_type,
    details
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5
)
RETURNING id, product_id, name, description, component_type, details;

-- name: CreateProviderAPI :one
INSERT INTO inventory.apis (
    provider_component_id,
    name,
    api_type,
    network_exposure
) VALUES (
    $1,
    $2,
    $3,
    $4
)
RETURNING id, provider_component_id, name, api_type, network_exposure;

-- name: GetAPIProviderComponentID :one
SELECT provider_component_id
FROM inventory.apis
WHERE id = $1;

-- name: AddConsumerAPI :exec
INSERT INTO inventory.component_api_consumers (
    component_id,
    api_id
) VALUES (
    $1,
    $2
);

-- name: RemoveConsumerAPI :one
DELETE FROM inventory.component_api_consumers
WHERE component_id = $1 AND api_id = $2
RETURNING component_id;

-- name: GetComponentByID :many
SELECT
    component.id,
    component.product_id,
    component.name,
    component.description,
    component.component_type,
    component.details,
    COALESCE(api.id, 0::BIGINT) AS api_id,
    COALESCE(api.name, ''::TEXT) AS api_name,
    COALESCE(api.api_type, ''::TEXT) AS api_type,
    COALESCE(api.network_exposure, 'internal'::inventory.network_exposure) AS api_network_exposure,
    COALESCE(api.api_role, ''::TEXT) AS api_role
FROM inventory.components AS component
LEFT JOIN LATERAL (
    SELECT
        provider_api.id,
        provider_api.name,
        provider_api.api_type,
        provider_api.network_exposure,
        'provider'::TEXT AS api_role,
        0::SMALLINT AS role_order
    FROM inventory.apis AS provider_api
    WHERE provider_api.provider_component_id = component.id

    UNION ALL

    SELECT
        consumer_api.id,
        consumer_api.name,
        consumer_api.api_type,
        consumer_api.network_exposure,
        'consumer'::TEXT AS api_role,
        1::SMALLINT AS role_order
    FROM inventory.component_api_consumers AS consumer
    JOIN inventory.apis AS consumer_api ON consumer_api.id = consumer.api_id
    WHERE consumer.component_id = component.id
) AS api ON TRUE
WHERE component.id = $1
ORDER BY api.role_order, api.id;

-- name: ListComponentsByProductID :many
WITH paged_components AS (
    SELECT
        id,
        product_id,
        name,
        description,
        component_type,
        details
    FROM inventory.components
    WHERE product_id = sqlc.arg('product_id')
    ORDER BY id
    LIMIT sqlc.arg('limit')
    OFFSET sqlc.arg('offset')
)
SELECT
    component.id,
    component.product_id,
    component.name,
    component.description,
    component.component_type,
    component.details,
    COALESCE(api.id, 0::BIGINT) AS api_id,
    COALESCE(api.name, ''::TEXT) AS api_name,
    COALESCE(api.api_type, ''::TEXT) AS api_type,
    COALESCE(api.network_exposure, 'internal'::inventory.network_exposure) AS api_network_exposure,
    COALESCE(api.api_role, ''::TEXT) AS api_role
FROM paged_components AS component
LEFT JOIN LATERAL (
    SELECT
        provider_api.id,
        provider_api.name,
        provider_api.api_type,
        provider_api.network_exposure,
        'provider'::TEXT AS api_role,
        0::SMALLINT AS role_order
    FROM inventory.apis AS provider_api
    WHERE provider_api.provider_component_id = component.id

    UNION ALL

    SELECT
        consumer_api.id,
        consumer_api.name,
        consumer_api.api_type,
        consumer_api.network_exposure,
        'consumer'::TEXT AS api_role,
        1::SMALLINT AS role_order
    FROM inventory.component_api_consumers AS consumer
    JOIN inventory.apis AS consumer_api ON consumer_api.id = consumer.api_id
    WHERE consumer.component_id = component.id
) AS api ON TRUE
ORDER BY component.id, api.role_order, api.id;

-- name: DeleteComponent :one
DELETE FROM inventory.components
WHERE id = $1
RETURNING id;
