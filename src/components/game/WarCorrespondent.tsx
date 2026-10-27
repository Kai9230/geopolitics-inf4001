"use client";

interface Props {
  messages: string[];
  demo?: boolean;
}

export default function WarCorrespondent({
  messages,
  demo = false,
}: Props) {
  return (
    <section className="war-dock" aria-label="War correspondent">
      <h2>
        📡 WAR CORRESPONDENT
        {demo ? " · DEMO" : ""}
      </h2>

      <div
        className="war-dock-feed"
        tabIndex={0}
        aria-label="Battle reports and decisions, newest first"
      >
        {messages.map((message, index) => (
          <div
            key={`${index}-${message}`}
            className="correspondent-text"
          >
            {message}
          </div>
        ))}
      </div>
    </section>
  );
}