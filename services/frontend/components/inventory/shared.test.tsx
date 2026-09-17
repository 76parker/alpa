import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { TextInput } from "../../src/ui";
import { Field } from "./shared";

it("renders a labelled field when no supplementary help is needed", () => {
  render(
    <Field label="Component name">
      <TextInput />
    </Field>,
  );

  expect(screen.getByRole("textbox", { name: "Component name" })).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "About Component name" }),
  ).toBeNull();
});
