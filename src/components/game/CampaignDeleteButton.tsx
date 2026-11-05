"use client";

import { useRef, useState } from "react";
import { CampaignClient } from "@/lib/api/CampaignClient";
import s from "./CampaignExperience.module.css";

export default function CampaignDeleteButton({ id, name }: { id: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  async function remove() {
    if (pending.current || confirmation !== "DELETE") return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await CampaignClient.remove(id);
      dialog.current?.close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Deletion failed. Try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return <>
    <button type="button" onClick={() => {
      setConfirmation(""); setError(""); dialog.current?.showModal();
    }}>Delete campaign</button>
    <dialog ref={dialog} className={s.deleteDialog} aria-labelledby={`delete-${id}`}
      onCancel={event => { if (pending.current) event.preventDefault(); }}>
      <h2 id={`delete-${id}`}>Delete {name}?</h2>
      <p>This permanently removes this campaign, its battles and its replay history.</p>
      <label>Type DELETE to confirm
        <input autoComplete="off" value={confirmation} disabled={busy}
          onChange={e => setConfirmation(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <div><button type="button" autoFocus disabled={busy} onClick={() => dialog.current?.close()}>Keep campaign</button>{" "}
        <button type="button" disabled={busy || confirmation !== "DELETE"} onClick={() => void remove()}>
          {busy ? "Deleting campaign and history…" : "Permanently delete"}
        </button></div>
    </dialog>
  </>;
}
