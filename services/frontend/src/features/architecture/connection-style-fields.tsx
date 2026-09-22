import { FormField, SelectControl } from "@/components/shared/controls";
import {
  connectionArrows,
  connectionShapes,
  connectionStrokes,
  type ConnectionStyle,
} from "./connection-style";
const labels = {
  bezier: "Curved",
  smoothstep: "Elbow",
  straight: "Straight",
  solid: "Solid",
  dashed: "Dashed",
  dotted: "Dotted",
  closed: "Filled arrow",
  open: "Open arrow",
  none: "No arrow",
};
export function ConnectionStyleFields({
  value,
  onChange,
  disabled,
}: {
  value: ConnectionStyle;
  onChange: (value: ConnectionStyle) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="connection-style-fields" disabled={disabled}>
      <legend>Connection appearance</legend>
      {(
        [
          ["shape", "Line shape", connectionShapes],
          ["stroke", "Line style", connectionStrokes],
          ["arrow", "Arrowhead", connectionArrows],
        ] as const
      ).map(([key, label, options]) => (
        <FormField key={key} id={`connection-${key}`} label={label}>
          <SelectControl
            id={`connection-${key}`}
            label={label}
            value={value[key]}
            disabled={disabled}
            onChange={(next) => onChange({ ...value, [key]: next })}
            options={options.map((option) => ({
              value: option,
              label: labels[option],
            }))}
          />
        </FormField>
      ))}
      <svg
        viewBox="0 0 300 55"
        role="img"
        aria-label={`${labels[value.shape]}, ${labels[value.stroke]}, ${labels[value.arrow]}`}
      >
        <path
          d={
            value.shape === "bezier"
              ? "M 12 42 C 120 42 170 12 280 12"
              : value.shape === "smoothstep"
                ? "M 12 42 H 138 Q 148 42 148 32 V 22 Q 148 12 158 12 H 280"
                : "M 12 42 L 280 12"
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={
            value.stroke === "dashed"
              ? "8 5"
              : value.stroke === "dotted"
                ? "2 5"
                : undefined
          }
        />
        {value.arrow !== "none" ? (
          <path
            d="M 270 6 L 282 12 L 270 18"
            fill={value.arrow === "closed" ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          />
        ) : null}
      </svg>
      <p className="form-hint">Saved in this browser for this connection.</p>
    </fieldset>
  );
}
