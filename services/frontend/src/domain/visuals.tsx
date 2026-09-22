import { Database, Globe, Server, Code2 } from "lucide-react";
import type { Component, Language } from "@/api/types";
import { isInfrastructure } from "@/api/types";
import {
  languageLabel,
  technologyFor,
  technologySubtitle,
  technologies,
} from "./catalog";
const icons: Record<string, string> = {
  cassandra: "cba62.svg",
  prometheus: "c5df8.svg",
  grafana: "8ca84.svg",
  minio: "13b3a.svg",
  nginx: "50fec.svg",
  elasticsearch: "21abc.svg",
  traefik: "68f09.png",
  memcached: "5ab18.svg",
  rabbitmq: "a68f5.svg",
  s3: "9a5df.svg",
  go: "29923.png",
  typescript: "6849c.png",
  kotlin: "03d25.svg",
  kafka: "c3a21.svg",
  postgresql: "7bbb2.svg",
  redis: "c869e.svg",
  temporal: "ccb5b.svg",
  python: "8558c.png",
  "c#": "51572.png",
  javascript: "360dd.png",
  airflow: "technology/airflow.svg",
  "argo-workflows": "technology/argo-workflows.svg",
  assembly: "technology/assembly.svg",
  bash: "technology/bash.svg",
  c: "technology/c.svg",
  "c++": "technology/cpp.svg",
  ceph: "technology/ceph.svg",
  clickhouse: "technology/clickhouse.svg",
  clojure: "technology/clojure.svg",
  cobol: "technology/cobol.svg",
  "common-lisp": "technology/common-lisp.svg",
  dart: "technology/dart.svg",
  delphi: "technology/delphi.svg",
  elixir: "technology/elixir.svg",
  envoy: "technology/envoy.svg",
  erlang: "technology/erlang.svg",
  etcd: "technology/etcd.svg",
  "f#": "technology/fsharp.svg",
  fortran: "technology/fortran.svg",
  groovy: "technology/groovy.svg",
  haskell: "technology/haskell.svg",
  jaeger: "technology/jaeger.svg",
  java: "technology/java.svg",
  julia: "technology/julia.svg",
  keycloak: "technology/keycloak.svg",
  kong: "technology/kong.svg",
  lua: "technology/lua.svg",
  mariadb: "technology/mariadb.svg",
  matlab: "technology/matlab.svg",
  mongodb: "technology/mongodb.svg",
  mysql: "technology/mysql.svg",
  nats: "technology/nats.svg",
  nim: "technology/nim.svg",
  "objective-c": "technology/objective-c.svg",
  ocaml: "technology/ocaml.svg",
  opensearch: "technology/opensearch.svg",
  opentelemetry: "technology/opentelemetry.svg",
  perl: "technology/perl.svg",
  php: "technology/php.svg",
  powershell: "technology/powershell.svg",
  prolog: "technology/prolog.svg",
  pulsar: "technology/pulsar.svg",
  r: "technology/r.svg",
  ruby: "technology/ruby.svg",
  rust: "technology/rust.svg",
  scala: "technology/scala.svg",
  scratch: "technology/scratch.svg",
  shell: "technology/shell.svg",
  solidity: "technology/solidity.svg",
  sql: "technology/sql.svg",
  swift: "technology/swift.svg",
  vault: "technology/vault.svg",
  "visual-basic": "technology/visual-basic.svg",
  zig: "technology/zig.svg",

  pascal: "technology/pascal.svg",
  zabbix: "technology/zabbix.svg",
  haproxy: "technology/haproxy.svg",
  zipkin: "technology/zipkin.svg",
};
export function TechnologyIcon({
  name,
  size = 24,
}: {
  name: string;
  size?: number;
}) {
  const asset = icons[name];
  const Fallback = technologies.some((item) => item.name === name)
    ? Database
    : Code2;
  return asset ? (
    <img
      className="technology-icon"
      data-technology={name}
      data-monochrome={[
        "common-lisp",
        "scratch",
        "etcd",
        "opensearch",
        "ceph",
        "kong",
        "jaeger",
        "keycloak",
        "rust",
        "cobol",
        "assembly",
        "objective-c",
        "pulsar",
        "mysql",
        "mariadb",
        "bash",
        "shell",
        "solidity",
        "vault",
      ].includes(name)}
      src={`/assets/${asset}`}
      alt=""
      style={{ width: size, height: size }}
    />
  ) : (
    <Fallback
      className="technology-icon"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
export function ComponentIcon({
  component,
  size = 24,
}: {
  component: Component;
  size?: number;
}) {
  return (
    <TechnologyIcon
      name={
        isInfrastructure(component)
          ? component.details.technology_name
          : "language" in component.details
            ? component.details.language
            : ""
      }
      size={size}
    />
  );
}
export function TypeIcon({ type }: { type: Component["type"] }) {
  const Icon =
    type === "infrastructure"
      ? Database
      : type === "frontend-service"
        ? Globe
        : Server;
  return <Icon size={16} aria-hidden="true" />;
}
export function componentSubtitle(component: Component) {
  return isInfrastructure(component)
    ? technologySubtitle(component.details.technology_name)
    : `${"language" in component.details ? languageLabel(component.details.language as Language) : ""} ${component.type === "frontend-service" ? "Frontend Service" : "Backend Service"}`;
}
export function componentSystem(component: Component) {
  return isInfrastructure(component)
    ? technologyFor(component.details.technology_name).label
    : component.name;
}
