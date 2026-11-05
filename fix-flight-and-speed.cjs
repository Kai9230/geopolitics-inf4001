/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const root = process.cwd();
const files = new Map();

function read(file) {
  return files.has(file)
    ? files.get(file)
    : fs.readFileSync(path.join(root, file), "utf8")
        .replace(/\r\n/g, "\n");
}

function change(file, before, after) {
  const source = read(file);

  if (source.includes(after)) return;

  if (source.split(before).length !== 2) {
    throw new Error(
      "Unexpected file version: " + file + ". No files changed."
    );
  }

  files.set(file, source.replace(before, () => after));
}

change(
  `src/components/game/MapTypes.ts`,
  `  fast?: boolean;`,
  `  fast?: boolean;
  showAircraft?: boolean;`
);

change(
  `src/components/game/BattleEffects.tsx`,
  `  fast?: boolean;`,
  `  fast?: boolean;
  showAircraft?: boolean;`
);

change(
  `src/components/game/BattleEffects.tsx`,
  `  fast = false,
}: Props)`,
  `  fast = false,
  showAircraft = true,
}: Props)`
);

change(
  `src/components/game/BattleEffects.tsx`,
  `{[0, 1].map((index: number) => (`,
  `{showAircraft && [0, 1].map((index: number) => (`
);

change(
  `src/components/game/BattleEffects.tsx`,
  `{dice && dice.defenderLoss > 0 && (`,
  `{showAircraft && dice && dice.defenderLoss > 0 && (`
);

change(
  `src/components/game/RiskMap.tsx`,
  `              fast={battleAnimation.fast}`,
  `              showAircraft={battleAnimation.showAircraft}
              fast={battleAnimation.fast}`
);

change(
  `src/components/CampaignExperience.tsx`,
  `    id: event.revision,`,
  `    id: event.revision,
    showAircraft: state.activeAttack?.exchangeNumber === 0,`
);

const page = "src/components/CampaignExperience.tsx";
const source = read(page);
const speed = /const \[fast, setFast\] =\s*useState\((true|false)\);/;

if (!speed.test(source)) {
  throw new Error("Speed setting not found. No files changed.");
}

files.set(
  page,
  source.replace(
    speed,
    "const [fast, setFast] = useState(false);"
  )
);

const backup = path.join(
  path.dirname(root),
  path.basename(root) + "-flight-backup-" + Date.now()
);

for (const [file] of files) {
  const destination = path.join(backup, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, file), destination);
}

for (const [file, content] of files) {
  fs.writeFileSync(path.join(root, file), content);
  console.log("Updated " + file);
}

console.log(
  "Done: one aircraft flyover per attack; default NPC speed 1x."
);
console.log("Backup: " + backup);