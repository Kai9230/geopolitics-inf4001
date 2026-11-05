import Link from "next/link";

import s from "@/styles/Campaign.module.css";

export default function HowToPlay() {
  return (
    <main className={s.shell}>
      <div className={s.content}>
        <header className={s.header}>
          <div>
            <p className={s.eyebrow}>
              GEOPOLITICS / FIELD MANUAL
            </p>
            <h1 className={s.title}>
              How to play
            </h1>
          </div>

          <Link
            href="/lobby"
            className={s.link}
          >
            War room
          </Link>
        </header>

        <div className={s.split}>
          <section className={s.panel}>
            <h2>1. Create your campaign</h2>

            <p className={s.muted}>
              Choose your starting country and
              difficulty. Nine different opponents
              are randomly selected. Every country
              starts with its full population-based
              army. Turn order is random; each
              surviving participant receives one
              turn per round.
            </p>

            <table className={s.rulesTable}>
              <thead>
                <tr>
                  <th>Population up to</th>
                  <th>Soldiers</th>
                </tr>
              </thead>

              <tbody>
                {[
                  "5 million",
                  "10 million",
                  "25 million",
                  "50 million",
                  "75 million",
                  "100 million",
                  "125 million",
                  "150 million",
                  "Above 150 million",
                ].map((value, index) => (
                  <tr key={value}>
                    <td>{value}</td>
                    <td>{index + 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={s.panel}>
            <h2>2. Your turn</h2>

            <ol className={s.instructions}>
              <li>
                From round two, allocate two new
                soldiers per country you own.
              </li>
              <li>
                Click your country with at least
                two soldiers.
              </li>
              <li>
                Click an enemy country to launch
                your one attack. Any distance is
                allowed.
              </li>
              <li>
                Exchanges continue automatically
                against that locked target.
              </li>
              <li>
                Stop to end the attack and turn.
                A resolving exchange finishes
                before stopping.
              </li>
              <li>
                After conquest, transfer troops
                if desired and finish your turn.
                A second target must wait until
                your next turn.
              </li>
            </ol>

            <p className={s.muted}>
              You can skip your attack. Your turn
              waits for your decision.
            </p>
          </section>

          <section className={s.panel}>
            <h2>3. Dice and casualties</h2>

            <p className={s.muted}>
              Both sides roll min(attacker soldiers
              minus one, defender soldiers) dice.
              Pair dice in their original order.
              Higher roll wins; the other side
              loses one soldier. A tie kills
              neither soldier. There is no
              three-dice cap.
            </p>

            <p className={s.muted}>
              Example: 10 attackers against two
              defenders means two dice per side.
              Rolls [1,4] against [2,3] cause one
              loss on each side. Three attackers
              against five defenders also roll
              two per side. Each saved dice exchange can show a plane flight. Multiple
              exchanges against the same target remain one attack. Repeated notifications
              for an exchange do not launch extra flights.
            </p>

            <p className={s.muted}>
              If the attacker reaches one soldier,
              the attack and turn end, with
              ownership retained. An attack also
              ends on conquest or when stopped.
            </p>
          </section>

          <section className={s.panel}>
            <h2>4. Conquest and transfers</h2>

            <p className={s.muted}>
              Conquest gives the captured country
              max(2, floor(original soldier value
              / 2)) soldiers. A value of nine
              gives four; a value of one gives two.
            </p>

            <p className={s.muted}>
              Transfer between any two countries
              you own outside an active attack,
              after placing reinforcements.
              Leave at least one soldier at the
              source. Transfer controls appear
              once you own at least two countries.
            </p>

            <p className={s.muted}>
              A participant is eliminated only
              after losing all countries.
              Eliminated participants are skipped.
              Control all ten countries to win.
            </p>
          </section>

          <section className={s.panel}>
            <h2>
              5. NPCs, history and spectators
            </h2>

            <p className={s.muted}>
              NPCs compare armies and targets,
              allocate soldiers and explain their
              choices. Fast-forward speeds up
              visible play without hiding
              decisions. Play full history to watch recorded boards, dice and battles.
              Replay latest attack plays the most recent recorded attack.
              Pausing shows its saved result. Return to live to resume commands.
            </p>

            <p className={s.muted}>
              Share the link for public viewing.
              Only the signed-in owner can move,
              advance NPCs or delete the campaign.
              NPC simulation pauses when the
              owner closes the live game.
              Refreshing retains saved progress.
            </p>
          </section>

          <section className={s.panel}>
            <h2>6. Sound and commentary</h2>

            <p className={s.muted}>
              The turn chime plays once per human
              turn and follows effects settings.
              Vibration is optional and device
              dependent. Login music plays on the login and in the war room.
              Battle music plays throughout the game. Audio may need an initial
              click to unlock.
            </p>

            <p className={s.muted}>
              The AI correspondent describes
              saved battle facts. Groq reports
              are labelled AI; unavailable
              service produces a labelled factual
              fallback. The LLM never decides
              casualties. Miniatures show up to
              six representative figures per side;
              all actual dice are displayed.
            </p>
          </section>
          <section className={s.panel}>
            <h2>7. Alliances and diplomacy</h2>
            <p className={s.muted}>
              On your turn, after reinforcements and outside an attack, offer one alliance
              or end one treaty in the diplomacy panel. Offers can be rejected and still
              use your diplomatic action. Accepted treaties last through the next round.
              NPCs value useful deterrence against a stronger rival and prefer other targets
              while allied. Attacking an ally breaks the treaty immediately.
              Keeping a treaty until expiry adds five reputation. Ending it early costs five;
              attacking an ally costs 25. Reputation affects future acceptance.
              Alliances never share soldiers or victory: one participant must control all ten nations.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
