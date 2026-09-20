import process from "node:process";
import console from "node:console";
import { URL } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";
import { parse } from "yaml";
import { format } from "prettier";
const path = new URL("../../api-server/docs/openapi.yaml", import.meta.url);
const source = await readFile(path, "utf8");
const schema = parse(source);
const generated = astToString(await openapiTS(schema));
const entries = [
  ["apiTypes", "APIType"],
  ["clientNames", "ClientName"],
  ["languages", "Language"],
];
const enums =
  "// Generated from ../api-server/docs/openapi.yaml. Do not edit.\n" +
  entries
    .map(
      ([name, type]) =>
        `export const ${name} = ${JSON.stringify(schema.components.schemas[type].enum)} as const;`,
    )
    .join("\n");
for (const [file, text] of [
  ["src/api/schema.ts", generated],
  ["src/domain/enums.ts", enums],
]) {
  const formatted = await format(text, { parser: "typescript" });
  if (process.argv.includes("--check")) {
    if ((await readFile(file, "utf8")) !== formatted)
      throw new Error(`${file} is stale. Run npm run generate:api.`);
  } else await writeFile(file, formatted);
}
console.log(
  process.argv.includes("--check")
    ? "Generated API contract is current."
    : "Generated API types and form enum values.",
);
