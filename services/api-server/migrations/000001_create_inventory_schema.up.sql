CREATE SCHEMA inventory;

CREATE TABLE inventory.workspaces (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL
);

-- Table for products

CREATE TYPE inventory.product_criticality AS ENUM (
      'mission-critical',
      'business-critical',
      'business-operational',
      'office-productivity'
  );

CREATE TABLE inventory.products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES inventory.workspaces (id) ON DELETE CASCADE,
    product_code TEXT NOT NULL,
    owning_team_id BIGINT,
    name TEXT NOT NULL,
    criticality inventory.product_criticality NOT NULL,
    description TEXT
);

CREATE UNIQUE INDEX inventory_unique_product_code ON inventory.products (workspace_id, product_code);

-- Table for components
-- Represents the components that make up a product
CREATE TYPE inventory.component_type AS ENUM (
    'backend-service',
    'frontend-service',
    'infrastructure'
);

CREATE TABLE inventory.components (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES inventory.products (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    component_type inventory.component_type NOT NULL,
    details JSONB NOT NULL
);

-- Table for APIs
-- Represents the APIs that are exposed by a components
CREATE TYPE inventory.network_exposure AS ENUM (
    'internal',
    'internet'
);

CREATE TABLE inventory.apis (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    component_id BIGINT NOT NULL REFERENCES inventory.components (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    api_type TEXT NOT NULL,
    network_exposure inventory.network_exposure NOT NULL,
    documentation_url TEXT
);

CREATE INDEX apis_component_id_idx ON inventory.apis (component_id);

-- Table for component clients
CREATE TABLE inventory.component_clients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    component_id BIGINT NOT NULL REFERENCES inventory.components (id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    role TEXT NOT NULL,
    communication_type TEXT NOT NULL,
    action TEXT,
    capabilities TEXT,
    secure_connection BOOLEAN NOT NULL DEFAULT FALSE,
    api_id BIGINT REFERENCES inventory.apis (id) ON DELETE SET NULL
);

CREATE INDEX component_clients_component_id_idx ON inventory.component_clients (component_id);
CREATE INDEX component_clients_api_id_idx ON inventory.component_clients (api_id);
