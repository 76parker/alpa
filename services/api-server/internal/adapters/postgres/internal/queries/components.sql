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

-- name: GetComponentByID :one
SELECT
    id,
    product_id,
    name,
    description,
    component_type,
    details
FROM inventory.components
WHERE id = $1;

-- name: LockComponentForUpdate :one
SELECT id
FROM inventory.components
WHERE id = $1
FOR UPDATE;

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
SELECT id, product_id, name, description, component_type, details
FROM paged_components
ORDER BY id;

-- name: DeleteComponent :one
DELETE FROM inventory.components
WHERE id = $1
RETURNING id;
