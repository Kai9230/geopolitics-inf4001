export type Difficulty = "easy" | "normal" | "hard";

export type CampaignStatus = "active" | "completed";

export interface CampaignCountry {
  id: string;
  name: string;
  flag: string;

  population: number;

  // Original value calculated from population.
  baseSoldiers: number;

  // Current troop count.
  soldiers: number;

  ownerId: string;

  x: number;
  y: number;
}

export interface CampaignParticipant {
  id: string;
  name: string;
  kind: "human" | "npc";
}

export interface ActiveAttack {
  attackerCountryId: string;
  defenderCountryId: string;
  exchangeNumber: number;
}

export interface CampaignState {
  schemaVersion: 1;
  treaties?: { members: string[]; expiresRound: number; formedRound?: number; sharedRivalId?: string | null }[];
  reputation?: Record<string, number>;
  diplomacyUsed?: boolean;

  id: string;
  playerId: string;

  status: CampaignStatus;
  difficulty: Difficulty;

  countries: CampaignCountry[];
  participants: CampaignParticipant[];

  turnOrder: string[];
  turnIndex: number;
  round: number;

  pendingReinforcements: number;
  attackUsed: boolean;

  activeAttack: ActiveAttack | null;
  winnerId: string | null;

  revision: number;

  createdAt: number;
  updatedAt: number;
}

export interface CountrySeed {
  id: string;
  name: string;
  flag: string;
  population: number;

  x: number;
  y: number;
}

export type CampaignAction =
  | { type: "diplomacy"; targetId: string; operation: "offer" | "break" }
  | {
      type: "allocate";
      allocations: Record<string, number>;
    }
  | {
      type: "transfer";
      fromId: string;
      toId: string;
      amount: number;
    }
  | {
      type: "start-attack";
      fromId: string;
      toId: string;
    }
  | {
      type: "roll";
    }
  | {
      type: "stop-attack";
    }
  | {
      type: "end-turn";
    };

export interface CampaignEvent {
  revision: number;
  actorId: string;

  action: CampaignAction["type"];

  message: string;
  createdAt: number;

  dice: {
    attacker: number[];
    defender: number[];
    attackerLosses: number;
    defenderLosses: number;
  } | null;
}

export interface CampaignActionResult {
  state: CampaignState;
  event: CampaignEvent;
}

export type RandomInteger = (
  exclusiveMaximum: number,
) => number;