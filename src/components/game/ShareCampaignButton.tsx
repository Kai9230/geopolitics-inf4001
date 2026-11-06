"use client";

import { useRef, useState } from "react";
import s from "./CampaignExperience.module.css";

export default function ShareCampaignButton() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [manualLink, setManualLink] = useState("");

  async function share() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    setManualLink("");
    const link = window.location.href;

    try {
      await navigator.clipboard.writeText(link);
      setMessage("Link copied");
    } catch {
      // Older browsers may still allow copying from a selected text field.
      const field = document.createElement("textarea");
      const focused = document.activeElement;
      field.value = link;
      field.readOnly = true;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      try {
        field.select();
        if (!document.execCommand("copy")) throw new Error("Copy blocked");
        setMessage("Link copied");
      } catch {
        setManualLink(link);
        setMessage("Copy this campaign link:");
      } finally {
        field.remove();
        if (focused instanceof HTMLElement) focused.focus();
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className={s.shareControl}>
      <button type="button" disabled={busy} onClick={() => void share()}>
        {busy ? "Copying…" : message === "Link copied" ? "Link copied ✓" : "Share"}
      </button>
      <span className={s.shareStatus} role="status" aria-live="polite" aria-atomic="true">
        {message}
      </span>
      {manualLink && (
        <input aria-label="Campaign link" readOnly value={manualLink}
          onFocus={event => event.currentTarget.select()} />
      )}
    </div>
  );
}
