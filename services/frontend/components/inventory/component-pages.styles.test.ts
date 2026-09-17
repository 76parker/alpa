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

    expect(page).toContain("max-width: 1280px");
    expect(layout).toContain("minmax(460px,0.9fr)");
    expect(layout).toContain("gap: 24px");
    expect(preview).toContain("height: 560px");
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
