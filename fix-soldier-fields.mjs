


import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const file="src/components/CampaignExperience.tsx";
const target=path.join(root,file);
let source=fs.readFileSync(target,"utf8").replace(/\r\n/g,"\n");
const patches=[
  [
    "import Link from \"next/link\";",
    "import Link from \"next/link\";\nimport SoldierInput from \"./game/SoldierInput\";"
  ],
  [
    "            <input\n              type=\"number\"\n              min={0}\n\n              max={\n                state\n                  .pendingReinforcements\n              }\n\n              step={1}\n\n              value={\n                values[country.id] ??\n                0\n              }\n\n              onChange={(event) => {\n                setValues({\n                  ...values,\n\n                  [country.id]:\n                    Number(\n                      event.target.value,\n                    ),\n                });\n              }}\n            />",
    "            <SoldierInput\n              value={values[country.id] ?? 0}\n              min={0}\n              max={state.pendingReinforcements}\n              onChange={amount => setValues(current => ({\n                ...current,\n                [country.id]: amount,\n              }))}\n            />"
  ],
  [
    "            <input\n              type=\"number\"\n              min={1}\n\n              max={\n                source\n                  ? source.soldiers - 1\n                  : 1\n              }\n\n              step={1}\n              value={amount}\n\n              onChange={(event) => {\n                setAmount(\n                  Number(\n                    event.target.value,\n                  ),\n                );\n              }}\n            />",
    "            <SoldierInput\n              value={amount}\n              min={1}\n              max={source ? Math.max(0, source.soldiers - 1) : 0}\n              onChange={setAmount}\n            />"
  ],
  [
    "  const [amount, setAmount] =\n    useState(1);",
    "  const [amount, setAmount] =\n    useState(0);"
  ],
  [
    "                setAmount(1);",
    "                setAmount(0);"
  ]
];
for(const [before,after] of patches) {
 if(source.includes(after)) continue;
 if(source.split(before).length!==2) throw new Error("Unexpected CampaignExperience version; no files changed.");
 source=source.replace(before,()=>after);
}
const component="\"use client\";\n\ntype Props = {\n  value: number;\n  min: number;\n  max: number;\n  onChange: (amount: number) => void;\n};\n\nexport default function SoldierInput({ value, min, max, onChange }: Props) {\n  return (\n    <input\n      type=\"text\"\n      inputMode=\"numeric\"\n      pattern=\"[0-9]*\"\n      autoComplete=\"off\"\n      placeholder=\"Soldiers\"\n      value={value === 0 ? \"\" : String(value)}\n      aria-invalid={value !== 0 && (value < min || value > max)}\n      onChange={event => {\n        const raw = event.currentTarget.value.trim();\n        if (!/^[0-9]*$/.test(raw)) return;\n        const amount = raw === \"\" ? 0 : Number(raw);\n        if (!Number.isSafeInteger(amount)) return;\n        // Empty is displayed as empty; typed leading zeros are normalised.\n        onChange(amount);\n      }}\n    />\n  );\n}\n";
const inputFile="src/components/game/SoldierInput.tsx";
const files=new Map([[file,source],[inputFile,component]]);
const backup=path.join(path.dirname(root),path.basename(root)+"-input-backup-"+Date.now());
fs.mkdirSync(backup,{recursive:true});
for(const name of files.keys()) {
 const original=path.join(root,name), saved=path.join(backup,name);
 if(fs.existsSync(original)) {fs.mkdirSync(path.dirname(saved),{recursive:true});fs.copyFileSync(original,saved);}
}
const written=[];
try {
 for(const [name,content] of files) {
  const destination=path.join(root,name);fs.mkdirSync(path.dirname(destination),{recursive:true});written.push(name);fs.writeFileSync(destination,content);console.log("Updated "+name);
 }
} catch(error) {
 for(const name of written.reverse()) {
  const saved=path.join(backup,name),destination=path.join(root,name);
  if(fs.existsSync(saved))fs.copyFileSync(saved,destination);else fs.rmSync(destination,{force:true});
 }
 throw error;
}
console.log("Backup: "+backup);
console.log("Run npx tsc --noEmit, npm run lint and npm run build.");
