import styles from "@/styles/Campaign.module.css";

type BattleEvent = {
  actorId: string;
  action: string;

  dice?: {
    attackerLosses: number;
    defenderLosses: number;
  } | null;
};

export default function CampaignAnalytics({
  events,
}: {
  events: BattleEvent[];
}) {
  const yours = events.filter(
    event => event.actorId === "human"
  );

  const exchanges = yours.filter(
    event => event.dice
  );

  const attacks = yours.filter(
    event => event.action === "start-attack"
  ).length;

  const losses = exchanges.reduce(
    (sum, event) =>
      sum +
      (event.dice?.attackerLosses ?? 0),
    0,
  );

  const inflicted = exchanges.reduce(
    (sum, event) =>
      sum +
      (event.dice?.defenderLosses ?? 0),
    0,
  );

  return (
    <section
      className={styles.panel}
      aria-label="Your attack analytics"
    >
      <h2>Your battle record</h2>

      <p className={styles.muted}>
        Saved human attacks in the displayed
        history range.
      </p>

      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 10,
          fontSize: 12,
        }}
      >
        <dt>Attacks launched</dt>
        <dd>{attacks}</dd>

        <dt>Dice exchanges</dt>
        <dd>{exchanges.length}</dd>

        <dt>Defender losses inflicted</dt>
        <dd>{inflicted}</dd>

        <dt>Your attacking losses</dt>
        <dd>{losses}</dd>
      </dl>
    </section>
  );
}
