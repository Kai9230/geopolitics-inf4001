import { Country } from "../../types";

const COUNTRY_POOL = [
  { id: "za", name: "South Africa",  flag: "https://flagcdn.com/w80/za.png", soldiers: 12, x: 55, y: 84 },
  { id: "br", name: "Brazil",        flag: "https://flagcdn.com/w80/br.png", soldiers: 14, x: 32, y: 68 },
  { id: "ng", name: "Nigeria",       flag: "https://flagcdn.com/w80/ng.png", soldiers: 18, x: 48, y: 70 },
  { id: "eg", name: "Egypt",         flag: "https://flagcdn.com/w80/eg.png", soldiers: 14, x: 54, y: 58 },
  { id: "de", name: "Germany",       flag: "https://flagcdn.com/w80/de.png", soldiers: 11, x: 51, y: 47 },
  { id: "in", name: "India",         flag: "https://flagcdn.com/w80/in.png", soldiers: 9,  x: 68, y: 61 },
  { id: "cn", name: "China",         flag: "https://flagcdn.com/w80/cn.png", soldiers: 20, x: 74, y: 50 },
  { id: "jp", name: "Japan",         flag: "https://flagcdn.com/w80/jp.png", soldiers: 8,  x: 84, y: 52 },
  { id: "us", name: "United States", flag: "https://flagcdn.com/w80/us.png", soldiers: 22, x: 24, y: 49 },
  { id: "va", name: "Vatican City",  flag: "https://flagcdn.com/w80/va.png", soldiers: 1,  x: 51, y: 50 },
];

export interface RoundResult {
  atkRolls: number[];
  defRolls: number[];
  atkLosses: number;
  defLosses: number;
  conquered: boolean;
}

export class GameEngine {
  static generateInitialCountries(): Country[] {
    return COUNTRY_POOL.map((c, index) => ({
      id: c.id, name: c.name, flag: c.flag, soldiers: c.soldiers,
      x: c.x, y: c.y,
      ownerId: index === 0 ? "player" : `npc_${index}`,
      isPlayer: index === 0,
    }));
  }

  // PDF rule: attacker leaves 1 behind, dice count = min(attacker-1, defender), ties = no loss
  static resolveRound(attackerSoldiers: number, defenderSoldiers: number): RoundResult {
    const available = attackerSoldiers - 1;
    const diceCount = Math.min(available, defenderSoldiers);

    if (diceCount <= 0) {
      return { atkRolls: [], defRolls: [], atkLosses: 0, defLosses: 0, conquered: false };
    }

    const atkRolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
    const defRolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);

    let atkLosses = 0, defLosses = 0;
    for (let i = 0; i < diceCount; i++) {
      if (atkRolls[i] > defRolls[i]) defLosses++;
      else if (atkRolls[i] < defRolls[i]) atkLosses++;
    }

    return {
      atkRolls, defRolls, atkLosses, defLosses,
      conquered: defenderSoldiers - defLosses <= 0,
    };
  }

  // PDF rule: conquest reward = max(2, defender value / 2)
  static calculateConquestReward(originalDefenderSoldiers: number): number {
    return Math.max(2, Math.floor(originalDefenderSoldiers / 2));
  }

  // PDF rule: reinforcements = 2 per country at turn start (round 2+)
  static calculateReinforcements(countriesOwned: number): number {
    return countriesOwned * 2;
  }

  // Simple NPC AI — attack strongest enemy they can reach if they have >1 soldier
  static pickNpcTarget(npcCountries: Country[], allCountries: Country[]): { attacker: Country; defender: Country } | null {
    const attackable = npcCountries.filter((c) => c.soldiers >= 2);
    if (attackable.length === 0) return null;
    const attacker = attackable[Math.floor(Math.random() * attackable.length)];
    const enemies = allCountries.filter((c) => c.ownerId !== attacker.ownerId);
    if (enemies.length === 0) return null;
    const defender = enemies[Math.floor(Math.random() * enemies.length)];
    return { attacker, defender };
  }
}