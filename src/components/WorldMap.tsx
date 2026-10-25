"use client";
import { Country } from "@/types";

interface Props {
  countries: Country[];
  onCountryClick: (id: string) => void;
  selectedAtk: string | null;
}

export function WorldMap({ countries, onCountryClick, selectedAtk }: Props) {
  return (
    <div className="planet-board">
      {/* Layer 1: Rotating continents behind everything */}
      <div className="planet-continents"></div>
      
      {/* Layer 2: Subtle grid */}
      <div className="planet-grid"></div>

      {/* Layer 3: Atmospheric glow */}
      <div className="planet-glow"></div>

      {/* Layer 4: Country markers on top */}
      {countries.map((c) => {
        const isSelected = selectedAtk === c.id;
        return (
          <div
            key={c.id}
            onClick={() => onCountryClick(c.id)}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-110 z-10 ${isSelected ? "scale-125 z-20" : ""}`}
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
          >
            <div
              className={`flex flex-col items-center p-2 rounded-lg border-2 backdrop-blur-md shadow-2xl transition-all duration-300
                ${
                  c.isPlayer
                    ? "border-[#22c55e] bg-[#22c55e]/25 shadow-[#22c55e]/50"
                    : "border-[#dc2626] bg-[#dc2626]/25 shadow-[#dc2626]/50"
                }
                ${isSelected ? "ring-4 ring-[#f4c430] shadow-[#f4c430]/70" : ""}`}
            >
              <span className="text-2xl leading-none">{c.flag}</span>
              <span className="text-[10px] font-bold tracking-wider uppercase mt-1 text-white">
                {c.name}
              </span>
              <span className="font-mono text-sm font-black text-[#f4c430]">
                ⚔ {c.soldiers}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}