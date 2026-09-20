import { ArrowDown, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { Component, Product } from "@/api/types";
import { languageLabel } from "@/domain/catalog";
import { TechnologyIcon } from "@/domain/visuals";
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

export function serviceRepositoryURL(component: Component) {
  return "repository_url" in component.details &&
    typeof component.details.repository_url === "string"
    ? component.details.repository_url
    : "";
}

export function ServicesTable({
  components,
  product,
  descending,
  onSort,
}: {
  components: Component[];
  product: Product;
  descending: boolean;
  onSort: () => void;
}) {
  const SortIcon = descending ? ArrowDown : ArrowUp;
  return (
    <Table className="inventory-table services-table">
      <colgroup>
        <col className="service-name-column" />
        <col className="service-type-column" />
        <col className="service-language-column" />
        <col className="service-description-column" />
        <col className="service-action-column" />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead aria-sort={descending ? "descending" : "ascending"}>
            <button className="sort-button" onClick={onSort}>
              Name
              <SortIcon aria-hidden="true" />
            </button>
          </TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Language</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {components.map((component) => {
          const repositoryURL = serviceRepositoryURL(component);
          const language =
            "language" in component.details ? component.details.language : null;
          const frontend = component.type === "frontend-service";
          return (
            <TableRow key={component.id}>
              <TableCell>
                <div className="service-name">
                  <Link
                    className="name-link"
                    to={`${productPath(product)}/components/${component.id}`}
                    title={component.name}
                  >
                    {component.name}
                  </Link>
                  {repositoryURL ? (
                    /^https?:\/\//i.test(repositoryURL) ? (
                      <a
                        className="service-repository"
                        href={repositoryURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={repositoryURL}
                      >
                        {repositoryURL}
                      </a>
                    ) : (
                      <span
                        className="service-repository"
                        title={repositoryURL}
                      >
                        {repositoryURL}
                      </span>
                    )
                  ) : (
                    <span className="service-repository muted">
                      No repository URL
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="service-type">
                  <img
                    src={`/assets/${frontend ? "c8f5b.png" : "523d5.png"}`}
                    width={20}
                    height={20}
                    alt=""
                  />
                  {frontend ? "Frontend service" : "Backend service"}
                </span>
              </TableCell>
              <TableCell>
                <span className="service-language">
                  {language ? (
                    <>
                      <TechnologyIcon name={language} size={24} />
                      {languageLabel(language)}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </TableCell>
              <TableCell title={component.description || undefined}>
                <span className="service-description">
                  {component.description || "—"}
                </span>
              </TableCell>
              <TableCell>
                <ArchitectureLink product={product} componentID={component.id}>
                  Show on map
                </ArchitectureLink>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
