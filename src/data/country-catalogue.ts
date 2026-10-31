import type { CountrySeed } from "../types/game-state";

export const POPULATION_SOURCE = {
  url:
    "https://www.worldometers.info/" +
    "world-population/population-by-country/",
  year: 2026,
  checkedOn: "2026-10-31",
};

type CatalogueRow = [
  id: string,
  name: string,
  population: number,
  longitude: number,
  latitude: number,
];

const rows: CatalogueRow[] = [
  ["za", "South Africa", 65_453_084, 25, -29],
  ["in", "India", 1_476_625_576, 79, 22],
  ["cn", "China", 1_412_914_089, 104, 35],
  ["us", "United States", 349_035_494, -99, 39],
  ["ng", "Nigeria", 242_431_832, 8, 9],
  ["br", "Brazil", 213_562_666, -52, -10],
  ["jp", "Japan", 122_427_731, 138, 37],
  ["eg", "Egypt", 120_101_175, 30, 27],
  ["de", "Germany", 83_644_258, 10, 51],
  ["gb", "United Kingdom", 69_931_528, -2, 54],
  ["fr", "France", 66_746_401, 2, 47],
  ["it", "Italy", 58_926_166, 12, 43],
  ["es", "Spain", 47_850_793, -4, 40],
  ["ca", "Canada", 40_467_728, -106, 57],
  ["se", "Sweden", 10_701_047, 15, 62],
  ["gr", "Greece", 9_897_115, 23, 39],
  ["nz", "New Zealand", 5_287_479, 173, -41],
  ["va", "Vatican City", 506, 12.45, 41.9],
];

export const COUNTRY_CATALOGUE: CountrySeed[] =
  rows.map(
    ([id, name, population, longitude, latitude]) => ({
      id,
      name,
      population,
      flag: `https://flagcdn.com/w80/${id}.png`,

      // Fallback map positions.
      // The existing map can use its more precise centres.
      x: ((longitude + 180) / 360) * 100,
      y: ((90 - latitude) / 180) * 100,
    }),
  );