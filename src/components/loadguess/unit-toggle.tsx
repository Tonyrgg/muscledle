import type { Unit } from "@/lib/loadguess/types";

type UnitToggleProps = {
  unit: Unit;
  onUnitChange: (unit: Unit) => void;
};

const OPTIONS: { label: string; value: Unit }[] = [
  { label: "KG", value: "kg" },
  { label: "LBS", value: "lb" },
];

export function UnitToggle({ unit, onUnitChange }: UnitToggleProps) {
  return (
    <div
      className="loadguess-unit-toggle"
      role="group"
      aria-label="Select load display unit"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`loadguess-unit-toggle__button ${
            unit === option.value ? "loadguess-unit-toggle__button--active" : ""
          }`}
          aria-pressed={unit === option.value}
          onClick={() => onUnitChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
