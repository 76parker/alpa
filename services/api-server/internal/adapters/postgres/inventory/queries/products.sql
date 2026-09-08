-- name: CreateProduct :one
INSERT INTO inventory.products (
    workspace_id,
    product_code,
    owning_team_id,
    name,
    criticality,
    description
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
)
RETURNING id, workspace_id, product_code, owning_team_id, name, criticality, description;

-- name: GetProductByID :one
SELECT id, workspace_id, product_code, owning_team_id, name, criticality, description
FROM inventory.products
WHERE id = $1;

-- name: ListProductsByWorkspaceID :many
SELECT id, workspace_id, product_code, owning_team_id, name, criticality, description
FROM inventory.products
WHERE workspace_id = $1
ORDER BY id
LIMIT sqlc.arg('limit')
OFFSET sqlc.arg('offset');

-- name: DeleteProduct :one
DELETE FROM inventory.products
WHERE id = $1
RETURNING id;
