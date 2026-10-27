"use client";

import { useEffect, useRef } from "react";
import type { Country } from "../../types";

type TransferData = {
  from: Country;
  to: Country;
  max: number;
  reward: number;
};

export function TransferDialog({
  data,
  amount,
  busy,
  onChange,
  onConfirm,
}: {
  data: TransferData | null;
  amount: number;
  busy: boolean;
  onChange: (amount: number) => void;
  onConfirm: () => void;
}) {
  const reference = useRef<HTMLDialogElement>(null);
  const open = data !== null;

  useEffect(() => {
    const dialog = reference.current;

    if (open && !dialog?.open) {
      dialog?.showModal();
    }

    if (!open && dialog?.open) {
      dialog.close();
    }

    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [open]);

  const valid =
    data !== null &&
    Number.isInteger(amount) &&
    amount >= 0 &&
    amount <= data.max;

  return (
    <dialog
      ref={reference}
      className="command-dialog"
      aria-labelledby="transfer-title"
      onCancel={(event) => {
        // The conquest transfer must be confirmed.
        event.preventDefault();
      }}
    >
      {data && (
        <>
          <span className="dialog-eyebrow">
            Territory secured
          </span>

          <h2 id="transfer-title">
            Move your soldiers
          </h2>

          <p>
            {data.to.name} has received{" "}
            {data.reward} conquest soldiers.
            Choose how many extra soldiers to move
            from {data.from.name}.
          </p>

          <div className="transfer-preview">
            <div>
              <small>{data.from.name}</small>

              <strong>
                {data.from.soldiers -
                  (valid ? amount : 0)}
              </strong>

              <span>remain behind</span>
            </div>

            <b>→</b>

            <div>
              <small>{data.to.name}</small>

              <strong>
                {data.reward +
                  (valid ? amount : 0)}
              </strong>

              <span>after transfer</span>
            </div>
          </div>

          <label htmlFor="transfer-slider">
            Additional soldiers: {amount}
          </label>

          <input
            id="transfer-slider"
            type="range"
            min={0}
            max={data.max}
            step={1}
            value={
              Number.isFinite(amount) ? amount : 0
            }
            disabled={busy || data.max === 0}
            onChange={(event) =>
              onChange(Number(event.target.value))
            }
          />

          <label htmlFor="transfer-number">
            Exact amount
          </label>

          <input
            id="transfer-number"
            type="number"
            min={0}
            max={data.max}
            step={1}
            value={
              Number.isFinite(amount) ? amount : ""
            }
            disabled={busy}
            onChange={(event) =>
              onChange(
                event.target.value === ""
                  ? 0
                  : Number(event.target.value),
              )
            }
          />

          <p>
            Move 0–{data.max}. At least one soldier
            must remain in {data.from.name}.
          </p>

          <button
            type="button"
            autoFocus
            disabled={busy || !valid}
            onClick={onConfirm}
          >
            {busy
              ? "Saving transfer and resolving turns…"
              : "Confirm transfer and end turn"}
          </button>
        </>
      )}
    </dialog>
  );
}

export function HowToPlayDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const reference = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = reference.current;

    if (open && !dialog?.open) {
      dialog?.showModal();
    }

    if (!open && dialog?.open) {
      dialog.close();
    }

    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={reference}
      className="command-dialog"
      aria-labelledby="help-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <span className="dialog-eyebrow">
        Field manual
      </span>

      <h2 id="help-title">How to play</h2>

      <ol>
        <li>
          <b>Choose your army.</b> Click one of
          your countries with at least two soldiers.
        </li>

        <li>
          <b>Attack.</b> Click an enemy country
          to begin immediately. You can also use
          the dropdowns and Attack button.
        </li>

        <li>
          <b>Watch the exchange.</b> Each attacking
          die is compared with its defending die.
          The lower roll loses one soldier.
          Ties cause no loss.
        </li>

        <li>
          <b>Secure a conquest.</b> If the defender
          is eliminated, choose how many extra
          soldiers to transfer. Always leave one behind.
        </li>

        <li>
          <b>Watch enemy moves.</b> NPC nations
          take their turns automatically.
        </li>

        <li>
          <b>Change the pace.</b> Speed switches
          between 1× and 2.5× without rerolling
          dice or restarting the animation.
        </li>

        <li>
          <b>Win.</b> Capture all ten countries.
          You lose when you control none.
        </li>
      </ol>

      <p>
        Drag to pan the map. Use + and − to zoom.
        Exit returns to the War Room.
      </p>

      <button
        type="button"
        autoFocus
        onClick={onClose}
      >
        Got it
      </button>
    </dialog>
  );
}