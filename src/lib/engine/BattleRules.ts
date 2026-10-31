export interface DicePair {
  soldierNumber: number;
  attackerRoll: number;
  defenderRoll: number;
  outcome: "attacker-wins" | "defender-wins" | "tie";
}

export interface BattleExchange {
  pairs: DicePair[];
  attackerRolls: number[];
  defenderRolls: number[];
  attackerLosses: number;
  defenderLosses: number;
  attackerRemaining: number;
  defenderRemaining: number;
  conquered: boolean;
  canContinue: boolean;
}

/**
 * Pure battle rules.
 *
 * This class does not read Firebase, play audio, or animate.
 * The server will use it to calculate authoritative results.
 */
export class BattleRules {
  private static assertInteger(
    value: number,
    minimum: number,
    label: string,
  ): void {
    if (!Number.isSafeInteger(value) || value < minimum) {
      throw new Error(
        `${label} must be a whole number of at least ${minimum}.`,
      );
    }
  }

  private static assertDie(value: number): void {
    if (
      !Number.isInteger(value) ||
      value < 1 ||
      value > 6
    ) {
      throw new Error("Each die must be an integer from 1 to 6.");
    }
  }

  /**
   * The attacker always leaves one soldier behind.
   *
   * Examples:
   * 10 attackers, 2 defenders => 2 pairs
   * 3 attackers, 5 defenders => 2 pairs
   * 2 attackers, 5 defenders => 1 pair
   */
  static diceCount(
    attackerSoldiers: number,
    defenderSoldiers: number,
  ): number {
    this.assertInteger(
      attackerSoldiers,
      1,
      "Attacking soldiers",
    );

    this.assertInteger(
      defenderSoldiers,
      1,
      "Defending soldiers",
    );

    return Math.min(
      attackerSoldiers - 1,
      defenderSoldiers,
    );
  }

  /**
   * Resolve supplied rolls in their original order.
   *
   * Supplying rolls separately lets the server generate them
   * securely and lets tests use predictable values.
   */
  static resolveExchange(
    attackerSoldiers: number,
    defenderSoldiers: number,
    attackerRolls: readonly number[],
    defenderRolls: readonly number[],
  ): BattleExchange {
    const count = this.diceCount(
      attackerSoldiers,
      defenderSoldiers,
    );

    if (count === 0) {
      throw new Error(
        "An attacking country needs at least two soldiers.",
      );
    }

    if (
      attackerRolls.length !== count ||
      defenderRolls.length !== count
    ) {
      throw new Error(
        `Both sides must supply exactly ${count} dice.`,
      );
    }

    const pairs: DicePair[] = [];

    let attackerLosses = 0;
    let defenderLosses = 0;

    for (let index = 0; index < count; index += 1) {
      const attackerRoll = attackerRolls[index];
      const defenderRoll = defenderRolls[index];

      this.assertDie(attackerRoll);
      this.assertDie(defenderRoll);

      let outcome: DicePair["outcome"] = "tie";

      if (attackerRoll > defenderRoll) {
        defenderLosses += 1;
        outcome = "attacker-wins";
      } else if (attackerRoll < defenderRoll) {
        attackerLosses += 1;
        outcome = "defender-wins";
      }

      pairs.push({
        soldierNumber: index + 1,
        attackerRoll,
        defenderRoll,
        outcome,
      });
    }

    const attackerRemaining =
      attackerSoldiers - attackerLosses;

    const defenderRemaining =
      defenderSoldiers - defenderLosses;

    return {
      pairs,
      attackerRolls: [...attackerRolls],
      defenderRolls: [...defenderRolls],
      attackerLosses,
      defenderLosses,
      attackerRemaining,
      defenderRemaining,
      conquered: defenderRemaining === 0,
      canContinue:
        attackerRemaining >= 2 &&
        defenderRemaining > 0,
    };
  }

  /**
   * Convert a country's population into its original
   * soldier value using the exam's exact brackets.
   */
  static soldiersFromPopulation(population: number): number {
    this.assertInteger(population, 1, "Population");

    const limits = [
      5_000_000,
      10_000_000,
      25_000_000,
      50_000_000,
      75_000_000,
      100_000_000,
      125_000_000,
      150_000_000,
    ];

    const bracket = limits.findIndex(
      (limit) => population <= limit,
    );

    return bracket === -1 ? 9 : bracket + 1;
  }

  /**
   * Use the country's ORIGINAL population-based value.
   * Do not pass its remaining troops during a battle.
   */
  static conquestReward(baseSoldierValue: number): number {
    this.assertInteger(
      baseSoldierValue,
      1,
      "Original soldier value",
    );

    if (baseSoldierValue > 9) {
      throw new Error(
        "The original soldier value cannot exceed nine.",
      );
    }

    return Math.max(
      2,
      Math.floor(baseSoldierValue / 2),
    );
  }

  /**
   * Round one grants no reinforcements.
   * Starting in round two: two soldiers per owned country.
   */
  static reinforcementTotal(
    roundNumber: number,
    ownedCountryCount: number,
  ): number {
    this.assertInteger(roundNumber, 1, "Round number");

    this.assertInteger(
      ownedCountryCount,
      0,
      "Owned country count",
    );

    return roundNumber === 1
      ? 0
      : ownedCountryCount * 2;
  }

  /**
   * Validate troop amounts and preserve the troop total.
   *
   * Ownership, current turn, and absence of an active battle
   * must also be checked by the server before saving.
   */
  static transfer(
    sourceSoldiers: number,
    destinationSoldiers: number,
    amount: number,
  ): {
    sourceRemaining: number;
    destinationRemaining: number;
  } {
    this.assertInteger(
      sourceSoldiers,
      1,
      "Source soldiers",
    );

    this.assertInteger(
      destinationSoldiers,
      1,
      "Destination soldiers",
    );

    this.assertInteger(amount, 0, "Transfer amount");

    if (amount > sourceSoldiers - 1) {
      throw new Error(
        "A transfer must leave at least one soldier behind.",
      );
    }

    return {
      sourceRemaining: sourceSoldiers - amount,
      destinationRemaining: destinationSoldiers + amount,
    };
  }
}