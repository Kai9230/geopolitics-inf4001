"use client";

type SoldierInputProps = {
  value: number;
  min: number;
  max: number;
  onChange: (amount: number) => void;
};

export default function SoldierInput({
  value,
  min,
  max,
  onChange,
}: SoldierInputProps) {
  const displayedValue =
    Number.isSafeInteger(value) && value > 0
      ? String(value)
      : "";

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      spellCheck={false}
      placeholder="Soldiers"
      value={displayedValue}
      aria-invalid={
        value !== 0 &&
        (
          !Number.isSafeInteger(value) ||
          value < min ||
          value > max
        )
      }
      onChange={(event) => {
        const input = event.currentTarget;
        const raw = input.value;

        // Accept whole, non-negative numbers only.
        if (!/^[0-9]*$/.test(raw)) {
          input.value = displayedValue;
          return;
        }

        // Remove leading zeroes, including a lone zero.
        const normalized = raw.replace(/^0+/, "");

        const amount =
          normalized === ""
            ? 0
            : Number(normalized);

        if (!Number.isSafeInteger(amount)) {
          input.value = displayedValue;
          return;
        }

        // Update the visible input even when the numeric
        // value has not changed, for example "05" -> 5.
        input.value = normalized;

        onChange(amount);
      }}
      onBlur={(event) => {
        event.currentTarget.value = displayedValue;
      }}
    />
  );
}