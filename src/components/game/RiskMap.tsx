"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, CSSProperties } from "react";
import { Country } from "../../types";

interface Props {
  countries: Country[];
  onCountryClick: (id: string) => void;
  selectedAtk: string | null;
  conquestAnimation: { fromId: string; toId: string } | null;
}

const COUNTRY_TO_TERRITORY: Record<string, string> = {
  us: "western_us",
  br: "brazil",
  ng: "congo",
  eg: "egypt",
  de: "germany",
  in: "india",
  cn: "china",
  jp: "japan",
  za: "south_africa",
  va: "southern_europe",
};

export function RiskMap({ countries, onCountryClick, selectedAtk, conquestAnimation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clickRef = useRef(onCountryClick);
  const [svgContent, setSvgContent] = useState<string>("");
  
  // State to hold the calculated pixel positions for the animation
  const [dotPositions, setDotPositions] = useState<{ from: { x: number, y: number }, to: { x: number, y: number } } | null>(null);

  // Keep the click handler fresh
  useEffect(() => {
    clickRef.current = onCountryClick;
  }, [onCountryClick]);

  // 1. Fetch the SVG file
  useEffect(() => {
    fetch("/maps/risk-board.svg")
      .then((res) => res.text())
      .then((text) => setSvgContent(text))
      .catch((err) => console.error("Failed to load SVG map", err));
  }, []);

  // 2. Inject styles, badges, and click listeners into the SVG
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgContent) return;

    container.querySelectorAll(".injected-label").forEach((el) => el.remove());

    const allPaths = container.querySelectorAll("path");
    allPaths.forEach((path) => {
      path.style.opacity = "0.15";
      path.style.fill = "#1a2a4a";
      path.style.stroke = "#000";
      path.style.strokeWidth = "1";
      path.style.pointerEvents = "none";
    });

    countries.forEach((country) => {
      const territoryId = COUNTRY_TO_TERRITORY[country.id];
      if (!territoryId) return;

      const path = container.querySelector(`#${territoryId}`) as SVGPathElement;
      if (!path) return;

      const isSelected = selectedAtk === country.id;

      // Style territory
      path.style.opacity = "1";
      path.style.fill = country.isPlayer
        ? "rgba(34, 197, 94, 0.85)"
        : "rgba(220, 38, 38, 0.85)";
      path.style.pointerEvents = "auto";
      path.style.cursor = "pointer";
      path.style.stroke = isSelected ? "#f4c430" : "rgba(255,255,255,0.4)";
      path.style.strokeWidth = isSelected ? "3" : "1.5";
      path.style.filter = isSelected ? "drop-shadow(0 0 10px #f4c430)" : "none";
      path.style.transition = "all 0.2s";

      if (path.dataset.hasListener !== "true") {
        path.addEventListener("click", () => clickRef.current(country.id));
        path.dataset.hasListener = "true";
      }

      // Badges
      const bbox = path.getBBox();
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", cx.toString());
      circle.setAttribute("cy", cy.toString());
      circle.setAttribute("r", "14");
      circle.setAttribute("fill", "rgba(10, 15, 30, 0.9)");
      circle.setAttribute("stroke", country.isPlayer ? "#22c55e" : "#dc2626");
      circle.setAttribute("stroke-width", "2");
      circle.setAttribute("pointer-events", "none");
      circle.setAttribute("class", "injected-label");
      container.appendChild(circle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", cx.toString());
      text.setAttribute("y", (cy + 5).toString());
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "14");
      text.setAttribute("font-weight", "900");
      text.setAttribute("font-family", "monospace");
      text.setAttribute("fill", "#fff");
      text.setAttribute("pointer-events", "none");
      text.setAttribute("class", "injected-label");
      text.textContent = `⚔${country.soldiers}`;
      container.appendChild(text);

      const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
      img.setAttribute("href", country.flag);
      img.setAttribute("x", (cx - 12).toString());
      img.setAttribute("y", (cy - 26).toString());
      img.setAttribute("width", "24");
      img.setAttribute("height", "16");
      img.setAttribute("pointer-events", "none");
      img.setAttribute("class", "injected-label");
      container.appendChild(img);
    });
  }, [countries, selectedAtk, svgContent]);

  // 3. Calculate positions for the invading dots safely inside an effect
  useEffect(() => {
    if (!conquestAnimation || !containerRef.current) {
      setDotPositions(null);
      return;
    }

    const container = containerRef.current;
    const getPos = (id: string) => {
      const el = container.querySelector(`#${COUNTRY_TO_TERRITORY[id]}`) as SVGPathElement;
      const containerRect = container.getBoundingClientRect();
      if (!el || !containerRect) return { x: 0, y: 0 };
      
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2
      };
    };

    const from = getPos(conquestAnimation.fromId);
    const to = getPos(conquestAnimation.toId);
    setDotPositions({ from, to });
  }, [conquestAnimation, svgContent]);

  return (
    <div className="relative w-full h-[65vh] rounded-xl border-2 border-[#f4c430]/30 bg-[#0a1424] overflow-hidden shadow-2xl flex items-center justify-center p-2">
      
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain relative"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {/* Invading Dots Animation Overlay */}
      {dotPositions && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 15 }).map((_, i) => {
            const dotStyle = {
              left: `${dotPositions.from.x}px`,
              top: `${dotPositions.from.y}px`,
              animation: `invadeDot 1.5s cubic-bezier(0.4, 0, 1, 1) forwards`,
              animationDelay: `${i * 50}ms`,
              transform: 'translate(-50%, -50%)',
              "--target-x": `${dotPositions.to.x - dotPositions.from.x}px`,
              "--target-y": `${dotPositions.to.y - dotPositions.from.y}px`,
            } as CSSProperties;

            return (
              <div
                key={i}
                className="absolute w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_#22c55e]"
                style={dotStyle}
              />
            );
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes invadeDot {
          0% {
            transform: translate(-50%, -50%) translate(0, 0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(var(--target-x), var(--target-y));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}