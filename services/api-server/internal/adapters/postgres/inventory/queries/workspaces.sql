-- name: CreateWorkspace :one
INSERT INTO inventory.workspaces (name)
VALUES ($1)
RETURNING id, name;

-- name: GetWorkspaceByID :one
SELECT id, name
FROM inventory.workspaces
WHERE id = $1;

-- name: ListWorkspaces :many
SELECT id, name
FROM inventory.workspaces
ORDER BY id
LIMIT sqlc.arg('limit')
OFFSET sqlc.arg('offset');

-- name: DeleteWorkspace :one
DELETE FROM inventory.workspaces
WHERE id = $1
RETURNING id;
