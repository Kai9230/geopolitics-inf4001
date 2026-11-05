import { BattleRules } from "./BattleRules";

import type {
  CampaignAction,
  CampaignActionResult,
  CampaignCountry,
  CampaignParticipant,
  CampaignState,
  CountrySeed,
  Difficulty,
  RandomInteger,
} from "../../types/game-state";

interface CreateCampaignInput {
  id: string;
  playerId: string;
  selectedCountryId: string;
  countryPool: readonly CountrySeed[];
  difficulty: Difficulty;
}

export class CampaignEngine {
  /**
   * Return the participant whose turn it currently is.
   */
  static currentActor(state: CampaignState): string {
    const actorId = state.turnOrder[state.turnIndex];

    if (!actorId) {
      throw new Error(
        "The campaign turn order is invalid.",
      );
    }

    return actorId;
  }

  /**
   * Validate a random integer supplied by the server.
   */
  private static randomIndex(
    maximum: number,
    randomInteger: RandomInteger,
  ): number {
    if (
      !Number.isSafeInteger(maximum) ||
      maximum < 1
    ) {
      throw new Error(
        "The random number range is invalid.",
      );
    }

    const value = randomInteger(maximum);

    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value >= maximum
    ) {
      throw new Error(
        "The random number source returned an invalid value.",
      );
    }

    return value;
  }

  /**
   * Shuffle a copy of an array.
   * The original array is not changed.
   */
  private static shuffle<T>(
    values: readonly T[],
    randomInteger: RandomInteger,
  ): T[] {
    const result = [...values];

    for (
      let index = result.length - 1;
      index > 0;
      index -= 1
    ) {
      const target = this.randomIndex(
        index + 1,
        randomInteger,
      );

      const temporary = result[index];

      result[index] = result[target];
      result[target] = temporary;
    }

    return result;
  }

  /**
   * Create a campaign with:
   *
   * - One country selected by the human player.
   * - Nine different countries selected randomly.
   * - Population-based starting soldiers.
   * - Randomized participant turn order.
   */
  static create(
    input: CreateCampaignInput,
    randomInteger: RandomInteger,
    now: number,
  ): CampaignState {
    if (!input.id || !input.playerId) {
      throw new Error(
        "Campaign and player IDs are required.",
      );
    }

    const difficulties: readonly Difficulty[] = [
      "easy",
      "normal",
      "hard",
    ];

    if (!difficulties.includes(input.difficulty)) {
      throw new Error(
        "Choose a valid difficulty level.",
      );
    }

    const uniqueIds = new Set<string>(
      input.countryPool.map(
        (country: CountrySeed) => country.id,
      ),
    );

    if (
      input.countryPool.length < 10 ||
      uniqueIds.size !== input.countryPool.length
    ) {
      throw new Error(
        "The catalogue must contain at least ten unique countries.",
      );
    }

    const selected: CountrySeed | undefined =
      input.countryPool.find(
        (country: CountrySeed) =>
          country.id === input.selectedCountryId,
      );

    if (!selected) {
      throw new Error(
        "Choose a starting country from the catalogue.",
      );
    }

    const opponents: CountrySeed[] = this.shuffle(
      input.countryPool.filter(
        (country: CountrySeed) =>
          country.id !== selected.id,
      ),
      randomInteger,
    ).slice(0, 9);

    const participants: CampaignParticipant[] = [
      {
        id: "human",
        name: selected.name,
        kind: "human",
      },
      ...opponents.map(
        (
          country: CountrySeed,
        ): CampaignParticipant => ({
          id: `npc:${country.id}`,
          name: country.name,
          kind: "npc",
        }),
      ),
    ];

    const chosenCountries: CountrySeed[] = [
      selected,
      ...opponents,
    ];

    const countries: CampaignCountry[] =
      chosenCountries.map(
        (
          country: CountrySeed,
          index: number,
        ): CampaignCountry => {
          const baseSoldiers =
            BattleRules.soldiersFromPopulation(
              country.population,
            );

          return {
            id: country.id,
            name: country.name,
            flag: country.flag,
            population: country.population,
            baseSoldiers,
            soldiers: baseSoldiers,
            ownerId: participants[index].id,
            x: country.x,
            y: country.y,
          };
        },
      );

    return {
      schemaVersion: 1,

      id: input.id,
      playerId: input.playerId,

      status: "active",
      difficulty: input.difficulty,

      countries,
      participants,

      turnOrder: this.shuffle(
        participants.map(
          (participant: CampaignParticipant) =>
            participant.id,
        ),
        randomInteger,
      ),

      turnIndex: 0,
      round: 1,

      pendingReinforcements: 0,
      attackUsed: false,

      activeAttack: null,
      winnerId: null,

      revision: 0,

      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Find a country in this campaign.
   */
  private static getCountry(
    state: CampaignState,
    countryId: string,
  ): CampaignCountry {
    const country: CampaignCountry | undefined =
      state.countries.find(
        (item: CampaignCountry) =>
          item.id === countryId,
      );

    if (!country) {
      throw new Error(
        "That country is not in this campaign.",
      );
    }

    return country;
  }

  /**
   * Prevent a participant from controlling another
   * participant's country.
   */
  private static requireOwned(
    country: CampaignCountry,
    actorId: string,
  ): void {
    if (country.ownerId !== actorId) {
      throw new Error(
        "You can only control countries you own.",
      );
    }
  }

  /**
   * Reinforcements must be allocated before other actions.
   */
  private static requireReady(
    state: CampaignState,
  ): void {
    if (state.pendingReinforcements > 0) {
      throw new Error(
        "Allocate all reinforcements before continuing.",
      );
    }
  }

  /**
   * Transfers and ending a turn normally are unavailable
   * while an attack is active.
   *
   * Stopping an attack has its own action.
   */
  private static requireNoAttack(
    state: CampaignState,
  ): void {
    if (state.activeAttack) {
      throw new Error(
        "Finish or stop the current attack first.",
      );
    }
  }

  /**
   * Complete the campaign when one participant
   * controls every country.
   */
  private static checkVictory(
    state: CampaignState,
  ): void {
    if (state.countries.length === 0) {
      throw new Error(
        "The campaign has no countries.",
      );
    }

    const owners = new Set<string>(
      state.countries.map(
        (country: CampaignCountry) =>
          country.ownerId,
      ),
    );

    if (owners.size === 1) {
      state.status = "completed";
      state.winnerId = state.countries[0].ownerId;

      state.activeAttack = null;
      state.pendingReinforcements = 0;
    }
  }

  /**
   * Advance to the next participant who still owns
   * at least one country.
   *
   * Crossing the end of the original turn order
   * begins the next round.
   */
  private static advanceTurn(
    state: CampaignState,
  ): void {
    this.checkVictory(state);

    if (state.status === "completed") {
      return;
    }

    state.activeAttack = null;
    state.attackUsed = false;
    state.diplomacyUsed = false;
    state.pendingReinforcements = 0;

    for (
      let attempts = 0;
      attempts < state.turnOrder.length;
      attempts += 1
    ) {
      state.turnIndex += 1;

      if (state.turnIndex >= state.turnOrder.length) {
        state.turnIndex = 0;
        state.round += 1;
      }

      const nextActor = this.currentActor(state);

      const ownedCountryCount =
        state.countries.filter(
          (country: CampaignCountry) =>
            country.ownerId === nextActor,
        ).length;

      if (ownedCountryCount === 0) {
        continue;
      }

      state.pendingReinforcements =
        BattleRules.reinforcementTotal(
          state.round,
          ownedCountryCount,
        );

      return;
    }

    throw new Error(
      "No eligible participant was found.",
    );
  }

  /**
   * Apply one action to a COPY of the saved campaign.
   *
   * Authentication and campaign ownership must be
   * checked by the server repository before calling this.
   */
  static apply(
    savedState: CampaignState,
    actorId: string,
    action: CampaignAction,
    randomInteger: RandomInteger,
    now: number,
  ): CampaignActionResult {
    if (savedState.status !== "active") {
      throw new Error(
        "This campaign has already finished.",
      );
    }

    if (this.currentActor(savedState) !== actorId) {
      throw new Error(
        "It is not this participant's turn.",
      );
    }

    const state: CampaignState =
      structuredClone(savedState);

    let message = "";

    let dice: CampaignActionResult["event"]["dice"] =
      null;

    // Expired treaties never affect a new decision.
    state.treaties = (state.treaties ?? []).filter(t => t.expiresRound >= state.round);
    switch (action.type) {
      case "diplomacy": {
        this.requireReady(state);
        this.requireNoAttack(state);
        if (state.diplomacyUsed) throw new Error("One diplomatic action per turn.");
        const target = state.participants.find(p => p.id === action.targetId);
        if (!target || target.id === actorId ||
            !state.countries.some(c => c.ownerId === target.id)) {
          throw new Error("Choose another participant still in the game.");
        }
        const existing = state.treaties.find(t =>
          t.members.includes(actorId) && t.members.includes(target.id));
        if (action.operation === "break") {
          if (!existing) throw new Error("There is no active treaty to break.");
          state.treaties = state.treaties.filter(t => t !== existing);
          message = `Treaty with ${target.name} ended. Both sides may attack freely.`;
        } else {
          if (existing) throw new Error("A treaty already exists.");
          const strength = (id: string) => state.countries
            .filter(c => c.ownerId === id).reduce((n,c) => n + c.soldiers, 0);
          const mine = strength(actorId);
          const theirs = strength(target.id);
          const threat = Math.max(0, ...state.participants
            .filter(p => p.id !== actorId && p.id !== target.id)
            .map(p => strength(p.id)));
          // NPCs accept only if deterrence or a shared threat benefits them.
          const accepted = mine >= theirs || threat > theirs;
          if (accepted) {
            state.treaties.push({ members: [actorId, target.id], expiresRound: state.round + 1 });
            message = `${target.name} accepts a temporary alliance through round ${state.round + 1}: ` +
              (mine >= theirs ? "your army provides useful deterrence." : "a stronger common rival threatens it.");
          } else {
            message = `${target.name} rejects the offer: it sees no strategic benefit.`;
          }
        }
        state.diplomacyUsed = true;
        break;
      }
      case "allocate": {
        this.requireNoAttack(state);

        if (state.pendingReinforcements === 0) {
          throw new Error(
            "There are no reinforcements to allocate.",
          );
        }

        const allocations = Object.entries(
          action.allocations,
        );

        if (allocations.length === 0) {
          throw new Error(
            "Choose where to place your reinforcements.",
          );
        }

        let total = 0;

        /*
         * Validate every allocation before changing
         * any soldier counts.
         */
        for (const [countryId, amount] of allocations) {
          const country = this.getCountry(
            state,
            countryId,
          );

          this.requireOwned(country, actorId);

          if (
            !Number.isSafeInteger(amount) ||
            amount < 0
          ) {
            throw new Error(
              "Allocations must be non-negative whole numbers.",
            );
          }

          total += amount;

          if (!Number.isSafeInteger(total)) {
            throw new Error(
              "The allocation total is too large.",
            );
          }
        }

        if (total !== state.pendingReinforcements) {
          throw new Error(
            `Allocate exactly ${state.pendingReinforcements} soldiers.`,
          );
        }

        for (const [countryId, amount] of allocations) {
          const country = this.getCountry(
            state,
            countryId,
          );

          country.soldiers += amount;
        }

        state.pendingReinforcements = 0;

        const allocationDescription = allocations
          .filter(([, amount]) => amount > 0)
          .map(([countryId, amount]) => {
            const country = this.getCountry(
              state,
              countryId,
            );

            return `${country.name} +${amount}`;
          })
          .join(", ");

        message =
          `Allocated ${total} reinforcements: ` +
          allocationDescription;

        break;
      }

      case "transfer": {
        this.requireReady(state);
        this.requireNoAttack(state);

        if (action.fromId === action.toId) {
          throw new Error(
            "Choose two different countries.",
          );
        }

        const source = this.getCountry(
          state,
          action.fromId,
        );

        const destination = this.getCountry(
          state,
          action.toId,
        );

        this.requireOwned(source, actorId);
        this.requireOwned(destination, actorId);

        if (
          !Number.isSafeInteger(action.amount) ||
          action.amount < 1
        ) {
          throw new Error(
            "Transfer at least one whole soldier.",
          );
        }

        const result = BattleRules.transfer(
          source.soldiers,
          destination.soldiers,
          action.amount,
        );

        source.soldiers = result.sourceRemaining;

        destination.soldiers =
          result.destinationRemaining;

        message =
          `Transferred ${action.amount} soldiers ` +
          `from ${source.name} to ${destination.name}.`;

        break;
      }

      case "start-attack": {
        this.requireReady(state);
        this.requireNoAttack(state);

        if (state.attackUsed) {
          throw new Error(
            "Only one attack may be started per turn.",
          );
        }

        const attacker = this.getCountry(
          state,
          action.fromId,
        );

        const defender = this.getCountry(
          state,
          action.toId,
        );

        this.requireOwned(attacker, actorId);

        if (defender.ownerId === actorId) {
          throw new Error(
            "You cannot attack your own country.",
          );
        }

        if (attacker.soldiers < 2) {
          throw new Error(
            "You need at least two soldiers to attack.",
          );
        }

        // Betrayal is permitted, so every country remains a legal target.
        const betrayed = state.treaties.some(t =>
          t.members.includes(actorId) && t.members.includes(defender.ownerId));
        state.treaties = state.treaties.filter(t =>
          !(t.members.includes(actorId) && t.members.includes(defender.ownerId)));
        state.attackUsed = true;

        state.activeAttack = {
          attackerCountryId: attacker.id,
          defenderCountryId: defender.id,
          exchangeNumber: 0,
        };

        message =
          `${attacker.name} begins an attack ` +
          `against ${defender.name}.` +
          (betrayed ? " This attack breaks their alliance." : "");

        break;
      }

      case "roll": {
        this.requireReady(state);

        const attack = state.activeAttack;

        if (!attack) {
          throw new Error(
            "There is no active attack.",
          );
        }

        const attacker = this.getCountry(
          state,
          attack.attackerCountryId,
        );

        const defender = this.getCountry(
          state,
          attack.defenderCountryId,
        );

        this.requireOwned(attacker, actorId);

        if (defender.ownerId === actorId) {
          throw new Error(
            "The defending country is already yours.",
          );
        }

        const count = BattleRules.diceCount(
          attacker.soldiers,
          defender.soldiers,
        );

        const roll = (): number =>
          this.randomIndex(6, randomInteger) + 1;

        const attackerRolls: number[] = Array.from(
          { length: count },
          roll,
        );

        const defenderRolls: number[] = Array.from(
          { length: count },
          roll,
        );

        const result = BattleRules.resolveExchange(
          attacker.soldiers,
          defender.soldiers,
          attackerRolls,
          defenderRolls,
        );

        attacker.soldiers =
          result.attackerRemaining;

        defender.soldiers =
          result.defenderRemaining;

        attack.exchangeNumber += 1;

        dice = {
          attacker: result.attackerRolls,
          defender: result.defenderRolls,
          attackerLosses: result.attackerLosses,
          defenderLosses: result.defenderLosses,
        };

        message =
          `${attacker.name} lost ` +
          `${result.attackerLosses}; ` +
          `${defender.name} lost ` +
          `${result.defenderLosses}.`;

        if (result.conquered) {
          const reward =
            BattleRules.conquestReward(
              defender.baseSoldiers,
            );

          defender.ownerId = actorId;
          defender.soldiers = reward;

          state.activeAttack = null;

          message +=
            ` ${defender.name} was conquered ` +
            `and received ${reward} reward soldiers.`;

          /*
           * Keep attackUsed true.
           *
           * The participant can transfer soldiers,
           * but cannot start another attack this turn.
           */
          this.checkVictory(state);
        } else if (!result.canContinue) {
          message +=
            " The attacker has one soldier left; " +
            "the attack and turn end.";

          this.advanceTurn(state);
        }

        /*
         * Otherwise the attack stays active.
         * The participant may roll again or stop.
         */
        break;
      }

      case "stop-attack": {
        if (!state.activeAttack) {
          throw new Error(
            "There is no attack to stop.",
          );
        }

        message =
          "The attack was stopped. Remaining troops " +
          "are retained and the turn ends.";

        this.advanceTurn(state);

        break;
      }

      case "end-turn": {
        this.requireReady(state);
        this.requireNoAttack(state);

        message = state.attackUsed
          ? "The turn ended after the attack."
          : "The participant skipped their attack.";

        this.advanceTurn(state);

        break;
      }

      default: {
        throw new Error(
          "Unknown campaign action.",
        );
      }
    }

    /*
     * A country must have at least one soldier
     * in every saved board.
     *
     * During conquest the defeated country receives
     * its reward before this check runs.
     */
    for (const country of state.countries) {
      if (
        !Number.isSafeInteger(country.soldiers) ||
        country.soldiers < 1
      ) {
        throw new Error(
          "The action produced an invalid soldier count.",
        );
      }
    }

    state.revision += 1;

    if (!Number.isSafeInteger(state.revision)) {
      throw new Error(
        "The campaign revision is invalid.",
      );
    }

    state.updatedAt = now;

    return {
      state,

      event: {
        revision: state.revision,
        actorId,
        action: action.type,
        message,
        createdAt: now,
        dice,
      },
    };
  }
}