"use client";
/* eslint-disable @next/next/no-img-element */
import { Country } from "../../types";

interface Props {
  countries: Country[];
  onCountryClick: (id: string) => void;
  selectedAtk: string | null;
}

const COUNTRY_PATHS: Record<string, string> = {
  us: "M 142,155 L 158,148 L 178,146 L 200,144 L 222,146 L 240,152 L 252,164 L 258,178 L 252,192 L 240,202 L 224,208 L 205,212 L 186,212 L 168,206 L 152,196 L 142,182 L 138,168 Z",
  br: "M 268,290 L 290,278 L 314,276 L 338,282 L 358,296 L 368,316 L 372,340 L 366,364 L 352,384 L 332,398 L 308,402 L 288,396 L 274,382 L 264,362 L 260,338 L 262,314 Z",
  ng: "M 462,332 L 480,325 L 498,326 L 512,336 L 516,352 L 510,368 L 496,376 L 478,374 L 464,364 L 456,350 Z",
  eg: "M 520,268 L 544,262 L 566,268 L 580,282 L 584,300 L 578,318 L 562,328 L 542,326 L 528,314 L 518,296 L 514,280 Z",
  za: "M 524,400 L 548,392 L 574,396 L 592,410 L 596,432 L 586,452 L 564,462 L 540,458 L 522,444 L 516,424 Z",
  de: "M 492,214 L 512,208 L 530,214 L 540,226 L 538,242 L 526,252 L 508,252 L 494,244 L 488,230 Z",
  in: "M 654,276 L 674,266 L 694,270 L 706,284 L 714,304 L 708,326 L 694,344 L 678,352 L 662,346 L 652,328 L 648,306 Z",
  cn: "M 694,214 L 720,202 L 752,200 L 780,210 L 802,226 L 812,250 L 808,278 L 792,300 L 766,312 L 740,312 L 716,300 L 698,282 L 688,258 Z",
  jp: "M 826,236 L 844,230 L 858,238 L 868,254 L 870,274 L 862,292 L 848,300 L 832,294 L 822,276 L 820,256 Z",
  va: "M 504,244 L 514,242 L 520,248 L 518,256 L 510,258 L 502,254 Z",
};

const MARKER_POSITIONS: Record<string, { x: number; y: number }> = {
  us: { x: 200, y: 180 },
  br: { x: 316, y: 340 },
  ng: { x: 486, y: 350 },
  eg: { x: 550, y: 296 },
  za: { x: 558, y: 428 },
  de: { x: 514, y: 230 },
  in: { x: 680, y: 306 },
  cn: { x: 752, y: 258 },
  jp: { x: 846, y: 264 },
  va: { x: 510, y: 250 },
};

export function WorldMap({ countries, onCountryClick, selectedAtk }: Props) {
  return (
    <div className="planet-board relative">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500'><g fill='%23f4c430' stroke='%23b8860b' stroke-width='0.5'><path d='M 100,80 Q 140,60 190,65 Q 240,75 260,100 Q 275,130 260,165 Q 245,200 210,220 Q 175,235 145,225 Q 115,210 100,185 Q 85,150 90,120 Z'/><path d='M 165,235 Q 200,230 225,250 Q 245,275 240,310 Q 230,345 205,365 Q 175,375 155,360 Q 135,335 130,305 Q 128,275 145,250 Z'/><path d='M 320,80 Q 370,60 430,65 Q 480,80 505,110 Q 520,145 510,180 Q 495,215 460,235 Q 420,245 385,235 Q 350,215 335,185 Q 325,155 325,125 Z'/><path d='M 380,255 Q 420,245 455,260 Q 480,285 480,320 Q 475,355 450,375 Q 420,390 395,380 Q 375,360 370,330 Q 368,300 380,275 Z'/><path d='M 500,70 Q 545,55 600,60 Q 650,75 680,105 Q 695,140 685,175 Q 665,210 625,230 Q 580,240 545,225 Q 515,205 505,175 Q 498,145 500,115 Z'/><path d='M 540,260 Q 575,255 605,270 Q 630,290 630,320 Q 625,350 600,370 Q 570,382 545,375 Q 525,360 522,335 Q 525,305 540,285 Z'/><path d='M 700,140 Q 730,130 760,140 Q 785,155 795,185 Q 800,215 785,240 Q 760,258 735,255 Q 715,245 705,225 Q 698,200 698,175 Q 698,155 700,140 Z'/><path d='M 760,265 Q 785,260 805,272 Q 818,290 815,312 Q 805,332 782,338 Q 762,332 752,315 Q 748,295 752,278 Z'/><path d='M 830,340 Q 860,330 885,340 Q 908,358 908,385 Q 902,412 878,425 Q 852,428 835,415 Q 822,395 822,370 Z'/></g></svg>")`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />

      <div className="planet-glow"></div>

      <svg
        viewBox="0 0 1000 500"
    className="absolute inset-0 w-full h-full z-5"
        preserveAspectRatio="xMidYMid meet"
      >
        {countries.map((c) => {
          const isSelected = selectedAtk === c.id;
          const path = COUNTRY_PATHS[c.id];
          if (!path) return null;
          return (
            <g key={c.id}>
              <path
                d={path}
                onClick={() => onCountryClick(c.id)}
                className="cursor-pointer transition-all duration-300"
                style={{
                  fill: c.isPlayer
                    ? isSelected ? "rgba(34, 197, 94, 0.9)" : "rgba(34, 197, 94, 0.55)"
                    : isSelected ? "rgba(220, 38, 38, 0.9)" : "rgba(220, 38, 38, 0.5)",
                  stroke: isSelected ? "#f4c430" : c.isPlayer ? "rgba(74, 222, 128, 1)" : "rgba(248, 113, 113, 1)",
                  strokeWidth: isSelected ? 4 : 2,
                  filter: isSelected ? "drop-shadow(0 0 16px #f4c430)" : "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
                }}
              />
            </g>
          );
        })}
      </svg>

      {countries.map((c) => {
        const pos = MARKER_POSITIONS[c.id];
        if (!pos) return null;
        const isSelected = selectedAtk === c.id;
        const isUrl = typeof c.flag === "string" && c.flag.startsWith("http");
        return (
          <div
            key={c.id}
            onClick={() => onCountryClick(c.id)}
           className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-110 z-15 ${isSelected ? "scale-125 z-20" : ""}`}
            style={{ left: `${(pos.x / 1000) * 100}%`, top: `${(pos.y / 500) * 100}%` }}
          >
            <div
              className={`flex flex-col items-center px-2 py-1 rounded-md border-2 backdrop-blur-md shadow-2xl ${
                c.isPlayer
                  ? "border-[#22c55e] bg-[#22c55e]/40 shadow-[#22c55e]/50"
                  : "border-[#dc2626] bg-[#dc2626]/40 shadow-[#dc2626]/50"
              } ${isSelected ? "ring-4 ring-[#f4c430] shadow-[#f4c430]/70" : ""}`}
            >
              {isUrl ? (
                <img src={c.flag} alt={c.name} className="w-8 h-5 object-cover rounded-sm" />
              ) : (
                <span className="text-lg leading-none">{c.flag}</span>
              )}
              <span className="font-mono text-xs font-black text-[#f4c430] mt-0.5">⚔ {c.soldiers}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}