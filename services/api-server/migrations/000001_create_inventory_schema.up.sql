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
    'infrastructure',
    'background-worker'
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
    provider_component_id BIGINT NOT NULL REFERENCES inventory.components (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    api_type TEXT NOT NULL,
    network_exposure inventory.network_exposure NOT NULL
);

CREATE INDEX apis_provider_component_id_idx ON inventory.apis (provider_component_id);

-- Table for consumer component/API relations
-- Provider ownership is stored directly on inventory.apis.

CREATE TABLE inventory.component_api_consumers (
    component_id BIGINT NOT NULL REFERENCES inventory.components (id) ON DELETE CASCADE,
    api_id BIGINT NOT NULL REFERENCES inventory.apis (id) ON DELETE CASCADE,
    PRIMARY KEY (component_id, api_id)
);

CREATE INDEX component_api_consumers_api_id_idx ON inventory.component_api_consumers (api_id);
