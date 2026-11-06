import type { CountrySeed } from "../types/game-state";

export const POPULATION_SOURCE = {
  url:
    "https://www.worldometers.info/" +
    "world-population/population-by-country/",
  year: 2026,
  checkedOn: "2026-11-05",
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
  ["es", "Spain", 47_850_793, -4, 40],
  ["ca", "Canada", 40_467_728, -106, 57],
  ["se", "Sweden", 10_701_046, 15, 62],
  ["gr", "Greece", 9_897_116, 23, 39],
  ["nz", "New Zealand", 5_287_479, 173, -41],
  ["va", "Vatican City", 506, 12.45, 41.9],

  // Additional choices.
  // Each campaign still contains exactly ten countries.
  ["mx", "Mexico", 132_997_658, -102, 24],
  ["id", "Indonesia", 287_886_782, 118, -3],
  ["pk", "Pakistan", 259_299_792, 69, 30],
  ["ru", "Russia", 143_394_458, 100, 60],
  ["et", "Ethiopia", 138_902_185, 40, 9],
  ["ph", "Philippines", 117_724_472, 122, 12],
  ["cd", "Democratic Republic of the Congo", 116_452_162, 23, -3],
  ["vn", "Vietnam", 102_177_431, 108, 16],
  ["ir", "Iran", 93_168_497, 54, 32],
  ["tr", "Turkey", 87_926_082, 35, 39],
  ["tz", "Tanzania", 72_563_780, 35, -6],
  ["th", "Thailand", 71_559_614, 101, 15],
  ["ke", "Kenya", 58_636_412, 38, 0],
  ["co", "Colombia", 53_936_226, -73, 4],
  ["kr", "South Korea", 51_600_388, 128, 36],
  ["dz", "Algeria", 48_028_334, 3, 28],
  ["ar", "Argentina", 46_003_734, -64, -35],
  ["au", "Australia", 27_227_096, 134, -25],
  ["sa", "Saudi Arabia", 35_165_787, 45, 24],
  ["pe", "Peru", 34_922_148, -75, -10],
  ["cl", "Chile", 19_945_850, -71, -30],
  ["zw", "Zimbabwe", 17_273_580, 30, -19],
  ["zm", "Zambia", 22_521_915, 28, -14],
];

export const COUNTRY_CATALOGUE: CountrySeed[] =
  rows.map(
    ([id, name, population, longitude, latitude]) => ({
      id,
      name,
      population,
      flag: `https://flagcdn.com/w80/${id}.png`,

      // Fallback positions for map markers.
      x: ((longitude + 180) / 360) * 100,
      y: ((90 - latitude) / 180) * 100,
    }),
  );