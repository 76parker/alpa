import { ArrowDown, ArrowUp, MapPinned } from "lucide-react";
import { Link } from "react-router-dom";
import type { Component, InfrastructureDetails, Product } from "@/api/types";
import { apiDisplayName, apiLabel, transportProtocol } from "@/domain/catalog";
import { ComponentIcon } from "@/domain/visuals";
import { ImportancyBadge } from "@/components/shared/controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArchitectureLink,
  productPath,
} from "@/features/products/product-layout";

export function InfrastructureTable({
  components,
  product,
  descending,
  onSort,
}: {
  components: (Component & { details: InfrastructureDetails })[];
  product: Product;
  descending: boolean;
  onSort: () => void;
}) {
  const SortIcon = descending ? ArrowDown : ArrowUp;
  return (
    <div className="infrastructure-table-frame">
      <Table className="infrastructure-table">
        <colgroup>
          <col style={{ width: "23%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "26%" }} />
          <col style={{ width: "auto" }} />
          <col style={{ width: 150 }} />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead aria-sort={descending ? "descending" : "ascending"}>
              <button className="sort-button" onClick={onSort}>
                Name <SortIcon aria-hidden="true" />
              </button>
            </TableHead>
            <TableHead>API</TableHead>
            <TableHead>Endpoints</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components.map((component) => (
            <TableRow key={component.id}>
              <TableCell>
                <div className="infrastructure-name">
                  <ComponentIcon component={component} size={32} />
                  <div>
                    <Link
                      className="name-link"
                      to={`${productPath(product)}/components/${component.id}`}
                    >
                      {component.name}
                    </Link>
                    <ImportancyBadge value={component.details.importancy} />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="infrastructure-apis">
                  {component.apis.length
                    ? component.apis.map((api) => (
                        <div
                          className={`infrastructure-api ${api.network_exposure}`}
                          key={api.id}
                          title={apiDisplayName(api)}
                        >
                          <span>
                            {apiLabel(api.api_type)}{" "}
                            <small>{transportProtocol(api.api_type)}</small>
                          </span>
                          <span className="resource-name">
                            {api.name || `API #${api.id}`}
                          </span>
                        </div>
                      ))
                    : "—"}
                </div>
              </TableCell>
              <TableCell>
                <div
                  className={`infrastructure-endpoints ${!component.details.endpoints.length ? "empty" : ""}`}
                >
                  {component.details.endpoints.length
                    ? component.details.endpoints.map((endpoint, index) => (
                        <span key={`${endpoint}-${index}`}>{endpoint}</span>
                      ))
                    : "—"}
                </div>
              </TableCell>
              <TableCell>
                <p className="infrastructure-description">
                  {component.description || "—"}
                </p>
              </TableCell>
              <TableCell>
                <ArchitectureLink
                  className="infrastructure-map-link"
                  product={product}
                  componentID={component.id}
                >
                  <MapPinned size={16} /> Show on map
                </ArchitectureLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
