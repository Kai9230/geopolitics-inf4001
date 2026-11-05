export interface Game {
  id: string;
  status: 'active' | 'completed';
  currentTurnPlayerId: string;
  turnNumber: number;
  playerId: string;
  createdAt: number;
}

export interface Country {
  id: string;
  name: string;
  flag: string;
  soldiers: number;
  ownerId: string; 
  isPlayer: boolean;
  factionColor?: string;
  x: number; 
  y: number; 
}