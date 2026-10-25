import { Country } from "../../types";

const COUNTRY_POOL = [
  { id: "za", name: "South Africa", flag: "🇿🇦", soldiers: 12, x: 55, y: 84 },
  { id: "br", name: "Brazil", flag: "🇧🇷", soldiers: 14, x: 32, y: 68 },
  { id: "ng", name: "Nigeria", flag: "🇳🇬", soldiers: 18, x: 48, y: 70 },
  { id: "eg", name: "Egypt", flag: "🇪🇬", soldiers: 14, x: 54, y: 58 },
  { id: "de", name: "Germany", flag: "🇩🇪", soldiers: 11, x: 51, y: 47 },
  { id: "in", name: "India", flag: "🇮🇳", soldiers: 9, x: 68, y: 61 },
  { id: "cn", name: "China", flag: "🇨🇳", soldiers: 20, x: 74, y: 50 },
  { id: "jp", name: "Japan", flag: "🇯🇵", soldiers: 8, x: 84, y: 52 },
  { id: "us", name: "USA", flag: "🇺🇸", soldiers: 22, x: 24, y: 49 },
  { id: "va", name: "Vatican City", flag: "🇻🇦", soldiers: 1, x: 51, y: 50 },
];

export class GameEngine {
  static generateInitialCountries(): Country[] {
    return COUNTRY_POOL.map((c, index) => ({
      id: c.id, name: c.name, flag: c.flag, soldiers: c.soldiers, x: c.x, y: c.y,
      ownerId: index === 0 ? "player" : `npc_${index}`, // 1 player, 9 NPCs
      isPlayer: index === 0,
    }));
  }
}