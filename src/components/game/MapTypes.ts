import type { Country } from "../../types";
import type { CampaignState } from "../../types/game-state";

export interface MapDiceResult {
  attacker: number[];
  defender: number[];
  attackerLoss: number;
  defenderLoss: number;
}

export interface MapBattleAnimation {
  id: number;
  fromId: string;
  toId: string;
  active: boolean;
  fast?: boolean;
  showAircraft?: boolean;
  attackKey?: string;
  playbackKey?: string;
  attackerColor: string;
  defenderColor: string;
  dice: MapDiceResult | null;
}

const NPC_COLORS = [
  "#fc7567",
  "#55d9c1",
  "#9294ff",
  "#f7a45b",
  "#72bbff",
  "#e987c2",
  "#c0d781",
  "#d5a67c",
  "#b7c7da",
];

export function participantColor(state: CampaignState, owner: string): string {
  if (owner === "human") return "#f4c430";
  const index = state.participants.filter(p => p.kind === "npc").findIndex(p => p.id === owner);
  return NPC_COLORS[Math.max(0,index) % NPC_COLORS.length];
}

export function getFactionColor(country: Country): string {
  if (country.factionColor) return country.factionColor;
  if (country.isPlayer) return "#f4c430";

  const id = country.ownerId || country.id;
  let hash = 0;

  for (let index = 0; index < id.length; index++) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return NPC_COLORS[hash % NPC_COLORS.length];
}

export function countryFlag(id: string): string {
  const code = id.toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) return "🌐";

  return String.fromCodePoint(
    ...Array.from(
      code,
      (character) => 127397 + character.charCodeAt(0),
    ),
  );
}