import type {
  CampaignAction,
  CampaignCountry,
  CampaignParticipant,
  CampaignState,
  Difficulty,
} from "../../types/game-state";

export interface NpcDecision {
  action: CampaignAction;
  reason: string;
}

interface TargetCandidate {
  country: CampaignCountry;
  score: number;
}

const CONTINUE_RATIO: Record<Difficulty, number> = {
  easy: 1.6,
  normal: 1.15,
  hard: 0.95,
};

const START_RATIO: Record<Difficulty, number> = {
  easy: 1.8,
  normal: 1.3,
  hard: 1.05,
};

export class NpcStrategy {
  static choose(state: CampaignState): NpcDecision {
    if (state.status !== "active") {
      throw new Error("This campaign has already finished.");
    }

    const actorId: string | undefined =
      state.turnOrder[state.turnIndex];

    if (!actorId) {
      throw new Error("The campaign turn order is invalid.");
    }

    const participant: CampaignParticipant | undefined =
      state.participants.find(
        (item: CampaignParticipant) => item.id === actorId,
      );

    if (!participant || participant.kind !== "npc") {
      throw new Error("It is not an NPC turn.");
    }

    const owned: CampaignCountry[] = state.countries
      .filter(
        (country: CampaignCountry) =>
          country.ownerId === actorId,
      )
      .sort(
        (
          a: CampaignCountry,
          b: CampaignCountry,
        ): number =>
          b.soldiers - a.soldiers ||
          a.id.localeCompare(b.id),
      );

    const strongest: CampaignCountry | undefined =
      owned[0];

    if (!strongest) {
      throw new Error(
        "An eliminated NPC cannot take a turn.",
      );
    }

    /*
     * Action 1: allocate reinforcements.
     *
     * All reinforcements go to the strongest country
     * to build an effective attacking force.
     */
    if (state.pendingReinforcements > 0) {
      return {
        action: {
          type: "allocate",
          allocations: {
            [strongest.id]: state.pendingReinforcements,
          },
        },
        reason:
          `Reinforcing ${strongest.name} with ` +
          `${state.pendingReinforcements} soldiers ` +
          "strengthens the NPC's main attacking army.",
      };
    }

    /*
     * Action 2: decide whether to continue an active attack.
     */
    const attack = state.activeAttack;

    if (attack) {
      const attacker: CampaignCountry | undefined =
        state.countries.find(
          (country: CampaignCountry) =>
            country.id === attack.attackerCountryId,
        );

      const defender: CampaignCountry | undefined =
        state.countries.find(
          (country: CampaignCountry) =>
            country.id === attack.defenderCountryId,
        );

      if (!attacker || !defender) {
        throw new Error(
          "The active attack references an unknown country.",
        );
      }

      if (
        attacker.ownerId !== actorId ||
        defender.ownerId === actorId
      ) {
        throw new Error(
          "The active attack has invalid ownership.",
        );
      }

      const available: number = attacker.soldiers - 1;

      const minimumRatio: number =
        CONTINUE_RATIO[state.difficulty];

      if (
        available < 1 ||
        available < defender.soldiers * minimumRatio
      ) {
        return {
          action: {
            type: "stop-attack",
          },
          reason:
            `${attacker.name} stops attacking ` +
            `${defender.name} because its remaining ` +
            "strength no longer meets its risk threshold.",
        };
      }

      return {
        action: {
          type: "roll",
        },
        reason:
          `${attacker.name} continues against ` +
          `${defender.name} because its remaining ` +
          "troops still support the attack.",
      };
    }

    /*
     * Action 3: finish a turn after the single allowed attack.
     */
    if (state.attackUsed) {
      return {
        action: {
          type: "end-turn",
        },
        reason:
          "The NPC has used its one attack and ends its turn.",
      };
    }

    /*
     * Action 4: consolidate spare soldiers.
     *
     * Normal and hard NPCs move spare troops into their
     * strongest country. Each donor keeps one soldier.
     */
    if (state.difficulty !== "easy") {
      const donor: CampaignCountry | undefined = owned
        .slice(1)
        .find(
          (country: CampaignCountry) =>
            country.soldiers > 1,
        );

      if (donor) {
        return {
          action: {
            type: "transfer",
            fromId: donor.id,
            toId: strongest.id,
            amount: donor.soldiers - 1,
          },
          reason:
            `Moving ${donor.soldiers - 1} spare soldiers ` +
            `from ${donor.name} to ${strongest.name} ` +
            "strengthens the main army while leaving " +
            "one soldier behind.",
        };
      }
    }

    /*
     * Action 5: evaluate enemy countries.
     *
     * Higher conquest rewards improve a target's score.
     * Stronger defenders reduce its score.
     * Hard NPCs also value eliminating an opponent.
     */
    const targets: TargetCandidate[] = state.countries
      .filter(
        (country: CampaignCountry) =>
          country.ownerId !== actorId,
      )
      .map(
        (country: CampaignCountry): TargetCandidate => {
          const enemyCountryCount: number =
            state.countries.filter(
              (item: CampaignCountry) =>
                item.ownerId === country.ownerId,
            ).length;

          const eliminationBonus: number =
            state.difficulty === "hard" &&
            enemyCountryCount === 1
              ? 5
              : 0;

          const reward: number = Math.max(
            2,
            Math.floor(country.baseSoldiers / 2),
          );

          return {
            country,
            score:
              reward +
              eliminationBonus -
              country.soldiers * 2,
          };
        },
      )
      .sort(
        (
          a: TargetCandidate,
          b: TargetCandidate,
        ): number =>
          b.score - a.score ||
          a.country.id.localeCompare(b.country.id),
      );

    const available: number = strongest.soldiers - 1;

    const minimumRatio: number =
      START_RATIO[state.difficulty];

    /*
     * Choose the highest-scoring target that also meets
     * the NPC's strength threshold.
     */
    const candidate: TargetCandidate | undefined =
      targets.find(
        (target: TargetCandidate) =>
          available >= 1 &&
          available >=
            target.country.soldiers * minimumRatio,
      );

    if (!candidate) {
      return {
        action: {
          type: "end-turn",
        },
        reason:
          "No target offers a sufficiently favourable " +
          "battle, so the NPC preserves its troops " +
          "and skips its attack.",
      };
    }

    return {
      action: {
        type: "start-attack",
        fromId: strongest.id,
        toId: candidate.country.id,
      },
      reason:
        `${strongest.name} attacks ` +
        `${candidate.country.name} after comparing ` +
        "defensive strength and conquest rewards" +
        (state.difficulty === "hard"
          ? ", including the opportunity to eliminate an opponent."
          : "."),
    };
  }
}