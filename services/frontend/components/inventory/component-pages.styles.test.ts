import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "globals.css"), "utf8")
  .replace(/\s+/g, " ")
  .replace(/,\s+/g, ",");

describe("component creation layout", () => {
  it("gives the form and preview a wider desktop workspace", () => {
    const page = styles.match(/\.component-create-page \{([^}]*)\}/)?.[1] ?? "";
    const layout =
      styles.match(/\.component-create-layout \{([^}]*)\}/)?.[1] ?? "";
    const preview =
      styles.match(
        /\.architecture-preview \.architecture-canvas \{([^}]*)\}/,
      )?.[1] ?? "";

    expect(page).toContain("max-width: none");
    expect(layout).toContain("minmax(0,1fr)");
    expect(layout).toContain("minmax(460px,565px)");
    expect(layout).toContain("gap: 24px");
    expect(preview).toContain("height: 560px");
    expect(styles).toContain(
      ".component-create-left-field .pf-v6-c-form-control { width: calc(100% - 4px); margin-left: 4px; }",
    );
    expect(styles).toContain(
      ".component-create-page .pf-v6-c-form-control > :focus-visible,.component-create-page .pf-v6-c-menu-toggle:focus-visible { outline-offset: -2px; }",
    );
    expect(styles).toContain(
      ".inventory-app .architecture-node-client-model .architecture-client-rail { border: 1px solid var(--app-border); border-radius: 0 4px 4px 0; background: var(--app-subtle); }",
    );
  });

  it("scrolls only the long desktop form and restores page scrolling on mobile", () => {
    const form =
      styles.match(
        /\.component-create-layout \.inventory-component-form \{([^}]*)\}/,
      )?.[1] ?? "";
    expect(form).toContain("max-height: calc(100vh - 180px)");
    expect(form).toContain("overflow-y: auto");
    expect(styles).toContain(
      ".component-create-layout .inventory-component-form { max-height: none; overflow-y: visible; padding-right: 0; scrollbar-gutter: auto; }",
    );
    expect(styles).toContain(
      ".architecture-preview .architecture-canvas { height: 480px; min-height: 480px; }",
    );
  });
});
