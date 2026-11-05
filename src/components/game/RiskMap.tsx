"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { geoEquirectangular, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";

import type { Country } from "../../types";
import centres from "../../data/country-centres.json";

import BattleEffects from "./BattleEffects";
import { FlightLedger } from "@/lib/engine/BattleVisuals";

import {
  getFactionColor,
  type MapBattleAnimation,
} from "./MapTypes";

import "./RiskMap.css";

const projection = geoEquirectangular()
  .scale(1000 / (2 * Math.PI))
  .translate([500, 250]);

const drawPath = geoPath(projection);

type World = FeatureCollection<
  Geometry,
  { id: string; name: string }
>;

type Props = {
  countries: Country[];
  selectedAtk: string | null;
  onCountryClick: (id: string) => void;
  targetId?: string | null;
  battleAnimation?: MapBattleAnimation | null;
  conquestAnimation?: {
    fromId: string;
    toId: string;
  } | null;
  fast?: boolean;
};

type DragState = {
  x: number;
  y: number;
  px: number;
  py: number;
  moved: boolean;
};

export function RiskMap({
  countries,
  selectedAtk,
  onCountryClick,
  targetId = null,
  battleAnimation = null,
}: Props) {
  const [world, setWorld] = useState<World | null>(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<string | null>(null);

  const layer = useRef<SVGGElement>(null);
  const frame = useRef(0);
  const flights = useRef(new FlightLedger());
  const panNow = useRef({ x: 0, y: 0 });
  const drag = useRef<DragState | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/maps/world.geojson", {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load the world map.");
        }

        return response.json() as Promise<World>;
      })
      .then(setWorld)
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;

        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load the world map.",
        );
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(frame.current);
  }, []);

  const paths = useMemo(
    () =>
      world?.features.map((feature) => ({
        id: feature.properties.id,
        name: feature.properties.name,
        d: drawPath(feature) || "",
      })) ?? [],
    [world],
  );

  const coordinates = centres as Record<
    string,
    { lon: number; lat: number }
  >;

  const territories = countries.map((country) => ({
    ...country,
    ...(coordinates[country.id.toLowerCase()] ?? {
      lon: (country.x / 100) * 360 - 180,
      lat: 90 - (country.y / 100) * 180,
    }),
  }));

  const countryById = new Map(
    territories.map((country) => [
      country.id.toLowerCase(),
      country,
    ]),
  );

  const attacker = territories.find(
    (country) => country.id === battleAnimation?.fromId,
  );

  const defender = territories.find(
    (country) => country.id === battleAnimation?.toId,
  );

  const from = attacker
    ? projection([attacker.lon, attacker.lat])
    : null;

  const to = defender
    ? projection([defender.lon, defender.lat])
    : null;

  const previewAttacker = territories.find(
    (country) => country.id === selectedAtk,
  );

  const previewDefender = territories.find(
    (country) => country.id === (targetId || hover),
  );

  const previewFrom = previewAttacker
    ? projection([
        previewAttacker.lon,
        previewAttacker.lat,
      ])
    : null;

  const previewTo = previewDefender
    ? projection([
        previewDefender.lon,
        previewDefender.lat,
      ])
    : null;

  const showPreview =
    previewAttacker &&
    previewDefender &&
    previewAttacker.isPlayer &&
    !previewDefender.isPlayer &&
    !battleAnimation?.active;

  function selectCountry(id: string): void {
    if (!drag.current?.moved) {
      onCountryClick(id);
    }
  }

  function transform(x: number, y: number): string {
    return (
      `translate(${x} ${y}) ` +
      `translate(500 250) scale(${zoom}) ` +
      "translate(-500 -250)"
    );
  }

  return (
    <section
      className="map-panel"
      aria-label="Interactive world map"
    >
      <div className="map-label">
        GLOBAL THEATRE
        <span>{countries.length} ACTIVE NATIONS</span>
      </div>

      <div className="map-controls">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() =>
            setZoom((previous) =>
              Math.min(4, previous + 0.4),
            )
          }
        >
          +
        </button>

        <button
          type="button"
          aria-label="Zoom out"
          onClick={() =>
            setZoom((previous) =>
              Math.max(1, previous - 0.4),
            )
          }
        >
          −
        </button>

        <button
          type="button"
          onClick={() => {
            cancelAnimationFrame(frame.current);
            frame.current = 0;
            drag.current = null;
            panNow.current = { x: 0, y: 0 };

            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          Reset view
        </button>
      </div>

      {error && (
        <p className="map-error">
          {error} Use the country selectors above.
        </p>
      )}

      <svg
        viewBox="0 0 1000 500"
        aria-label="Countries and animated battle routes"
        onPointerDown={(event) => {
          if (event.button !== 0) return;

          drag.current = {
            x: event.clientX,
            y: event.clientY,
            px: panNow.current.x,
            py: panNow.current.y,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const gesture = drag.current;

          // Moving the mouse after releasing must not pan.
          if (!gesture || event.buttons === 0) return;

          const screenDistance = Math.hypot(
            event.clientX - gesture.x,
            event.clientY - gesture.y,
          );

          if (!gesture.moved && screenDistance > 8) {
            gesture.moved = true;
            event.currentTarget.setPointerCapture(
              event.pointerId,
            );
          }

          if (!gesture.moved) return;

          const scale =
            1000 /
            event.currentTarget.getBoundingClientRect().width;

          const dx =
            (event.clientX - gesture.x) * scale;

          const dy =
            (event.clientY - gesture.y) * scale;

          panNow.current = {
            x: Math.max(
              -1300,
              Math.min(1300, gesture.px + dx),
            ),
            y: Math.max(
              -650,
              Math.min(650, gesture.py + dy),
            ),
          };

          if (!frame.current) {
            frame.current = requestAnimationFrame(() => {
              frame.current = 0;

              layer.current?.setAttribute(
                "transform",
                transform(
                  panNow.current.x,
                  panNow.current.y,
                ),
              );
            });
          }
        }}
        onPointerUp={(event) => {
          if (frame.current) {
            cancelAnimationFrame(frame.current);
            frame.current = 0;
          }

          if (drag.current?.moved) {
            setPan({ ...panNow.current });
          }

          if (
            event.currentTarget.hasPointerCapture(
              event.pointerId,
            )
          ) {
            event.currentTarget.releasePointerCapture(
              event.pointerId,
            );
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
          setPan({ ...panNow.current });
        }}
      >
        <defs>
          <radialGradient id="risk-ocean">
            <stop stopColor="#102a44" />
            <stop offset="1" stopColor="#030a15" />
          </radialGradient>

          <pattern
            id="risk-grid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M50 0H0V50"
              fill="none"
              stroke="#8ab8db"
              strokeOpacity=".1"
              strokeWidth=".5"
            />
          </pattern>
        </defs>

        <rect
          width="1000"
          height="500"
          fill="url(#risk-ocean)"
        />

        <g
          ref={layer}
          transform={transform(pan.x, pan.y)}
        >
          <image
            href="/textures/earth.jpg"
            width="1000"
            height="500"
            opacity=".55"
            preserveAspectRatio="none"
          />

          <rect
            width="1000"
            height="500"
            fill="#06101c"
            opacity=".34"
          />

          <rect
            width="1000"
            height="500"
            fill="url(#risk-grid)"
          />

          {paths.map((feature) => {
            const country = countryById.get(
              feature.id.toLowerCase(),
            );

            const selected =
              country?.id === selectedAtk;

            const targeted =
              country?.id === targetId;

            return (
              <path
                key={`${feature.id}-${feature.name}`}
                d={feature.d}
                className={country ? "territory" : ""}
                fill={
                  country
                    ? getFactionColor(country)
                    : "#102033"
                }
                fillOpacity={
                  country
                    ? selected || targeted
                      ? 0.8
                      : 0.48
                    : 0.12
                }
                stroke={
                  selected
                    ? "#fff1ad"
                    : targeted
                      ? "#ffae99"
                      : country
                        ? getFactionColor(country)
                        : "#718aa1"
                }
                strokeOpacity={country ? 0.95 : 0.25}
                strokeWidth={
                  selected || targeted ? 2 : 0.55
                }
                onClick={() => {
                  if (country) selectCountry(country.id);
                }}
                onMouseEnter={() =>
                  setHover(country?.id ?? null)
                }
                onMouseLeave={() => setHover(null)}
              >
                <title>
                  {country
                    ? `${country.name}: ${country.soldiers} soldiers`
                    : feature.name}
                </title>
              </path>
            );
          })}

          {territories.map((country) => {
            const point = projection([
              country.lon,
              country.lat,
            ]);

            if (!point) return null;

            const selected =
              selectedAtk === country.id;

            const targeted =
              targetId === country.id;

            return (
              <g
                key={country.id}
                className="map-marker"
                transform={
                  `translate(${point[0]} ${point[1]})`
                }
                role="button"
                tabIndex={0}
                aria-label={
                  `Select ${country.name}, ` +
                  `${country.soldiers} soldiers`
                }
                onClick={() => selectCountry(country.id)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();
                    onCountryClick(country.id);
                  }
                }}
                onMouseEnter={() =>
                  setHover(country.id)
                }
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(country.id)}
                onBlur={() => setHover(null)}
              >
                <circle
                  className="marker-hit-area"
                  r={22 / zoom}
                  fill="transparent"
                />

                <circle
                  className="marker-face"
                  r={
                    (selected || targeted ? 15 : 13) /
                    Math.sqrt(zoom)
                  }
                  fill="#030b15"
                  stroke={
                    selected
                      ? "#fff1ad"
                      : targeted
                        ? "#ffae99"
                        : getFactionColor(country)
                  }
                  strokeWidth="2"
                />

                <text
                  y="4"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="800"
                  fill="white"
                >
                  {country.soldiers}
                </text>

                {(hover === country.id || selected) && (
                  <g pointerEvents="none">
                    <rect
                      x="-55"
                      y="-35"
                      width="110"
                      height="18"
                      rx="4"
                      fill="#020812"
                    />

                    <text
                      y="-23"
                      textAnchor="middle"
                      fontSize="9"
                      fill="#f4c430"
                    >
                      {country.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {showPreview && previewFrom && previewTo && (
            <g
              className="attack-preview"
              pointerEvents="none"
              aria-label="Planned attack route"
            >
              <path
                d={
                  `M${previewFrom[0]} ${previewFrom[1]} ` +
                  `Q${(previewFrom[0] + previewTo[0]) / 2} ` +
                  `${Math.min(previewFrom[1], previewTo[1]) - 65} ` +
                  `${previewTo[0]} ${previewTo[1]}`
                }
                fill="none"
                stroke="#ffe19a"
                strokeWidth="2"
                strokeDasharray="6 5"
              />

              <circle
                cx={previewTo[0]}
                cy={previewTo[1]}
                r="19"
                fill="none"
                stroke="#ffe19a"
                strokeWidth="2"
                strokeDasharray="3 4"
              />
            </g>
          )}

          {battleAnimation?.active && from && to && (
            <BattleEffects
              key={battleAnimation.id}
              from={from as [number, number]}
              to={to as [number, number]}
              attackerColor={
                battleAnimation.attackerColor
              }
              defenderColor={
                battleAnimation.defenderColor
              }
              dice={battleAnimation.dice}
              id={battleAnimation.id}
              attackKey={battleAnimation.attackKey ?? `${battleAnimation.fromId}:${battleAnimation.toId}:${battleAnimation.id}`}
              playbackKey={battleAnimation.playbackKey ?? "live"}
              ledger={flights}
            />
          )}
        </g>
      </svg>

      <div className="map-bottom">
        <span>
          DRAG TO PAN · + / − TO ZOOM · CLICK TO SELECT
        </span>

        <span>
          {battleAnimation?.active
            ? "BATTLE IN PROGRESS"
            : "AWAITING ORDERS"}
        </span>
      </div>
    </section>
  );
}