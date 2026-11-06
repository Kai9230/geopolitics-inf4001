"use client";

import type { PresentedEvent } from "@/lib/engine/CampaignPresentation";
import styles from "../styles/Campaign.module.css";

export default function CampaignCorrespondent({ event, replay }: {
  event: PresentedEvent | null;
  replay: boolean;
}) {
  const report = event?.commentary;
  const ai = report?.source === "groq" && report.status === "ready";
  const pending = !!event?.dice && (!report || report.status === "pending");
  const label = ai ? "AI war correspondent" : pending ? "Preparing AI report" : "Battle report";

  return (
    <aside className={styles.correspondentDock}
      aria-label={replay ? "Recorded war correspondent" : "Live war correspondent"}
      data-live-correspondent={!replay}>
      <p className={styles.correspondentLabel}>
        <span className={styles.correspondentDot} aria-hidden="true" />
        {replay ? "Recorded frequency" : "Live frequency"} · {label}
      </p>
      <p className={styles.correspondentText} aria-live="polite">
        {report?.text || event?.message || "Command is standing by. Select a target when your turn begins."}
      </p>
      {event?.dice && (
        <p className={styles.correspondentMeta}>
          Saved event #{event.revision} · Attacker losses {event.dice.attackerLosses}
          {" · "}Defender losses {event.dice.defenderLosses}
        </p>
      )}
      {report?.status === "fallback" && (
        <p className={styles.correspondentMeta}>
          AI unavailable for this exchange · Factual battle report
        </p>
      )}
    </aside>
  );
}
