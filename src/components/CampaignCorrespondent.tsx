"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { usePathname } from "next/navigation";

import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../lib/firebase/config";
import { SoundEngine } from "../lib/audio/SoundEngine";

import styles from "../styles/Campaign.module.css";

interface ReportEvent {
  revision: number;
  action: string;
  message: string;

  dice?: {
    attackerLosses: number;
    defenderLosses: number;
  } | null;

  commentary?: {
    status:
      | "pending"
      | "ready"
      | "fallback";

    source?: "groq" | "fallback";
    text?: string;
    reason?: string | null;
  };
}

export default function CampaignCorrespondent() {
  const pathname = usePathname();

  const match = pathname.match(
    /^\/game\/([^/]+)\/?$/,
  );

  const gameId = match?.[1];

  if (!gameId) return null;

  return (
    <CorrespondentPanel
      key={gameId}
      gameId={gameId}
    />
  );
}

function CorrespondentPanel({
  gameId,
}: {
  gameId: string;
}) {
  const [view, setView] = useState<{
    event: ReportEvent | null;
    error: boolean;
  }>({
    event: null,
    error: false,
  });

  const lastSeen =
    useRef<number | null>(null);

  useEffect(() => {
    const reports = query(
      collection(
        db,
        "campaigns",
        gameId,
        "events",
      ),

      orderBy("revision", "desc"),
      limit(30),
    );

    return onSnapshot(
      reports,

      (snapshot) => {
        const entries =
          snapshot.docs.map(
            (item) =>
              item.data() as ReportEvent,
          );

        const newest = entries[0];

        if (newest) {
          if (
            lastSeen.current !== null &&
            newest.revision >
              lastSeen.current
          ) {
            if (
              newest.action === "allocate" ||
              newest.action === "transfer"
            ) {
              SoundEngine.reinforce();
            }
          }

          lastSeen.current =
            newest.revision;
        }

        setView({
          event:
            entries.find(
              (entry) => entry.dice,
            ) ?? null,

          error: false,
        });
      },

      () => {
        setView({
          event: null,
          error: true,
        });
      },
    );
  }, [gameId]);

  const event = view.event;
  const report = event?.commentary;

  const label =
    report?.source === "groq"
      ? "Live frequency · AI war correspondent"
      : report?.status === "pending"
        ? "Live frequency · Preparing AI report"
        : "Live frequency · Battle report";

  const text = view.error
    ? "The correspondent feed is unavailable. Check the campaign connection."
    : report?.text ||
      event?.message ||
      "Command is standing by. Select a target when your turn begins.";

  return (
    <aside
      className={
        styles.correspondentDock
      }
      aria-label="Live war correspondent"
    >
      <p
        className={
          styles.correspondentLabel
        }
      >
        <span
          className={
            styles.correspondentDot
          }
          aria-hidden="true"
        />

        {label}
      </p>

      <p
        className={
          styles.correspondentText
        }
        aria-live="polite"
      >
        {text}
      </p>

      {event?.dice && (
        <p
          className={
            styles.correspondentMeta
          }
        >
          Exchange {event.revision}
          {" · "}
          Attacker losses{" "}
          {event.dice.attackerLosses}
          {" · "}
          Defender losses{" "}
          {event.dice.defenderLosses}
        </p>
      )}

      {report?.reason ===
        "missing-key" && (
        <p
          className={
            styles.correspondentMeta
          }
        >
          AI unavailable: GROQ_API_KEY
          is not configured on the server.
        </p>
      )}

      {report?.status === "fallback" &&
        report.reason !==
          "missing-key" && (
          <p
            className={
              styles.correspondentMeta
            }
          >
            AI unavailable for this exchange
            {" · "}
            Factual fallback report
          </p>
        )}
    </aside>
  );
}