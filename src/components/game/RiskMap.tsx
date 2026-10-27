"use client";

import { useEffect, useMemo, useState } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import type {
  Feature,
  FeatureCollection,
  Geometry,
} from "geojson";
import type { Country } from "../../types";

interface Props {
  countries: Country[];
  onCountryClick: (id: string) => void;
  selectedAtk: string | null;

  conquestAnimation: {
    fromId: string;
    toId: string;
  } | null;
}

type Properties = Record<string, unknown> | null;

type WorldFeature = Feature<Geometry, Properties>;

type WorldData = FeatureCollection<Geometry, Properties>;

type Position = {
  x: number;
  y: number;
};

type CountryDefinition = {
  longitude: number;
  latitude: number;
  iso3: string;
  names: string[];
};

const WIDTH = 1200;
const HEIGHT = 600;

/**
 * Coordinates for your current ten-country project.
 *
 * Day 2 will replace this fixed lookup with the complete
 * country catalogue used for random game creation.
 */
const DEFINITIONS: Record<string, CountryDefinition> = {
  za: {
    longitude: 24,
    latitude: -29,
    iso3: "ZAF",
    names: ["South Africa"],
  },
  br: {
    longitude: -52,
    latitude: -12,
    iso3: "BRA",
    names: ["Brazil"],
  },
  ng: {
    longitude: 8,
    latitude: 9,
    iso3: "NGA",
    names: ["Nigeria"],
  },
  eg: {
    longitude: 30,
    latitude: 27,
    iso3: "EGY",
    names: ["Egypt"],
  },
  de: {
    longitude: 10,
    latitude: 51,
    iso3: "DEU",
    names: ["Germany"],
  },
  in: {
    longitude: 79,
    latitude: 22,
    iso3: "IND",
    names: ["India"],
  },
  cn: {
    longitude: 104,
    latitude: 35,
    iso3: "CHN",
    names: ["China"],
  },
  jp: {
    longitude: 138,
    latitude: 37,
    iso3: "JPN",
    names: ["Japan"],
  },
  us: {
    longitude: -100,
    latitude: 39,
    iso3: "USA",
    names: [
      "United States",
      "United States of America",
      "USA",
    ],
  },
  va: {
    longitude: 12.4534,
    latitude: 41.9029,
    iso3: "VAT",
    names: [
      "Vatican",
      "Vatican City",
      "Holy See",
    ],
  },
};

const NPC_COLORS = [
  "#60a5fa",
  "#f87171",
  "#a78bfa",
  "#fb923c",
  "#2dd4bf",
  "#f472b6",
  "#a3e635",
  "#e879f9",
  "#94a3b8",
];

function normalize(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

/**
 * Creates a flag emoji from a two-letter country code.
 * No flag images or network requests are involved.
 */
function flagFromCode(id: string): string {
  const code = id.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) {
    return "🌐";
  }

  return String.fromCodePoint(
    ...Array.from(code, (letter) => {
      return 127397 + letter.charCodeAt(0);
    }),
  );
}

function countryColor(country: Country): string {
  if (country.isPlayer) {
    return "#e9bf69";
  }

  const owner = String(country.ownerId ?? country.id);

  let hash = 0;

  for (let index = 0; index < owner.length; index += 1) {
    hash = (hash * 31 + owner.charCodeAt(index)) >>> 0;
  }

  return NPC_COLORS[hash % NPC_COLORS.length];
}

/**
 * Supports common Natural Earth / GeoJSON property names.
 */
function featureMatchesCountry(
  feature: WorldFeature,
  country: Country,
): boolean {
  const definition = DEFINITIONS[country.id.toLowerCase()];
  const properties = feature.properties ?? {};

  const codes = [
    feature.id,
    properties.ISO_A2,
    properties.iso_a2,
    properties.ISO_A3,
    properties.iso_a3,
    properties.ADM0_A3,
    properties.adm0_a3,
    properties.id,
  ].map(normalize);

  if (codes.includes(normalize(country.id))) {
    return true;
  }

  if (
    definition &&
    codes.includes(normalize(definition.iso3))
  ) {
    return true;
  }

  const names = [
    properties.name,
    properties.NAME,
    properties.ADMIN,
    properties.admin,
    properties.NAME_EN,
    properties.name_en,
  ].map(normalize);

  const acceptedNames = [
    country.name,
    ...(definition?.names ?? []),
  ].map(normalize);

  return names.some((name) => {
    return name !== "" && acceptedNames.includes(name);
  });
}

function isWorldData(value: unknown): value is WorldData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    type?: unknown;
    features?: unknown;
  };

  return (
    candidate.type === "FeatureCollection" &&
    Array.isArray(candidate.features)
  );
}

export function RiskMap({
  countries,
  onCountryClick,
  selectedAtk,
  conquestAnimation,
}: Props) {
  const [world, setWorld] = useState<WorldData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorld() {
      try {
        const response = await fetch("/maps/world.geojson", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Map request failed with status ${response.status}.`,
          );
        }

        const data: unknown = await response.json();

        if (!isWorldData(data)) {
          throw new Error(
            "world.geojson must contain a GeoJSON FeatureCollection.",
          );
        }

        if (!controller.signal.aborted) {
          setWorld(data);
          setError(null);
        }
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("World map failed to load:", loadError);

        setError(
          "The world map could not load. Check public/maps/world.geojson.",
        );
      }
    }

    void loadWorld();

    return () => controller.abort();
  }, []);

  const projection = useMemo(() => {
    return geoEquirectangular()
      .scale(WIDTH / (2 * Math.PI))
      .translate([WIDTH / 2, HEIGHT / 2])
      .precision(0.4);
  }, []);

  const pathGenerator = useMemo(() => {
    return geoPath(projection);
  }, [projection]);

  const shapes = useMemo(() => {
    if (!world) {
      return [];
    }

    return world.features.map((feature, index) => {
      const country = countries.find((candidate) => {
        return featureMatchesCountry(feature, candidate);
      });

      return {
        key: String(feature.id ?? index),
        path: pathGenerator(feature) ?? "",
        country,
      };
    });
  }, [world, countries, pathGenerator]);

  const positions = useMemo(() => {
    const result: Record<string, Position> = {};

    countries.forEach((country) => {
      const definition = DEFINITIONS[country.id.toLowerCase()];

      if (!definition) {
        return;
      }

      const projected = projection([
        definition.longitude,
        definition.latitude,
      ]);

      if (projected) {
        result[country.id] = {
          x: projected[0],
          y: projected[1],
        };
      }
    });

    return result;
  }, [countries, projection]);

  const from = conquestAnimation
    ? positions[conquestAnimation.fromId]
    : undefined;

  const to = conquestAnimation
    ? positions[conquestAnimation.toId]
    : undefined;

  const attackingCountry = conquestAnimation
    ? countries.find(
        (country) => country.id === conquestAnimation.fromId,
      )
    : undefined;

  const invasionColor = attackingCountry
    ? countryColor(attackingCountry)
    : "#e9bf69";

  /**
   * Centre zoom on the selected country.
   * All countries remain listed above the map at every zoom level.
   */
  const focus = selectedAtk
    ? positions[selectedAtk]
    : undefined;

  const focusX = focus?.x ?? WIDTH / 2;
  const focusY = focus?.y ?? HEIGHT / 2;

  const translateX = Math.min(
    0,
    Math.max(WIDTH * (1 - zoom), WIDTH / 2 - focusX * zoom),
  );

  const translateY = Math.min(
    0,
    Math.max(HEIGHT * (1 - zoom), HEIGHT / 2 - focusY * zoom),
  );

  const flightPath =
    from && to
      ? `M ${from.x} ${from.y - 22} L ${to.x} ${to.y - 22}`
      : "";

  const missingCountries = countries.filter((country) => {
    return !positions[country.id];
  });

  return (
    <section className="world-panel">
      <header className="command-header">
        <div>
          <p className="eyebrow">GEOPOLITICS</p>
          <h2>World Command</h2>
        </div>

        <span className="country-total">
          {countries.length} participating countries
        </span>
      </header>

      {/* Flags appear only above the map. */}
      <nav className="country-list" aria-label="Participating countries">
        {countries.map((country) => {
          const selected = selectedAtk === country.id;

          return (
            <button
              key={country.id}
              type="button"
              className={`country-card ${selected ? "selected" : ""}`}
              onClick={() => onCountryClick(country.id)}
              aria-pressed={selected}
              aria-label={`${country.name}, ${country.soldiers} soldiers`}
            >
              <span className="flag" aria-hidden="true">
                {flagFromCode(country.id)}
              </span>

              <span className="country-name">{country.name}</span>

              <span
                className="soldier-count"
                style={{ color: countryColor(country) }}
              >
                {country.soldiers}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="map-frame">
        <div className="map-toolbar" aria-label="Map zoom">
          <button
            type="button"
            onClick={() => setZoom((current) => Math.max(1, current - 0.5))}
            disabled={zoom === 1}
            aria-label="Zoom out"
          >
            −
          </button>

          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Reset map zoom"
          >
            {zoom.toFixed(1)}×
          </button>

          <button
            type="button"
            onClick={() => setZoom((current) => Math.min(4, current + 0.5))}
            disabled={zoom === 4}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>

        {!world && !error && (
          <div className="map-status" role="status">
            Loading world map…
          </div>
        )}

        {error && (
          <div className="map-status error" role="alert">
            {error}
          </div>
        )}

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="world-svg"
          role="group"
          aria-label="Interactive world map"
        >
          <rect width={WIDTH} height={HEIGHT} fill="#081725" />

          <g
            transform={
              `translate(${translateX} ${translateY}) scale(${zoom})`
            }
          >
            <image
              href="/textures/earth.jpg"
              width={WIDTH}
              height={HEIGHT}
              preserveAspectRatio="none"
              opacity="0.68"
              pointerEvents="none"
              aria-hidden="true"
            />

            {shapes.map(({ key, path, country }) => {
              const selected = country?.id === selectedAtk;

              return (
                <path
                  key={key}
                  d={path}
                  fill={country ? countryColor(country) : "#182d3d"}
                  fillOpacity={country ? 0.4 : 0.16}
                  stroke={selected ? "#fff0b0" : "#a6bbca"}
                  strokeOpacity={selected ? 1 : 0.45}
                  strokeWidth={selected ? 2 : 0.55}
                  vectorEffect="non-scaling-stroke"
                  role={country ? "button" : undefined}
                  tabIndex={country ? 0 : undefined}
                  aria-label={
                    country
                      ? `${country.name}, ${country.soldiers} soldiers`
                      : undefined
                  }
                  aria-pressed={country ? selected : undefined}
                  onClick={
                    country
                      ? () => onCountryClick(country.id)
                      : undefined
                  }
                  onKeyDown={
                    country
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onCountryClick(country.id);
                          }
                        }
                      : undefined
                  }
                  style={{
                    cursor: country ? "pointer" : "default",
                  }}
                />
              );
            })}

            {/* Clickable markers also make tiny countries selectable. */}
            {countries.map((country) => {
              const position = positions[country.id];

              if (!position) {
                return null;
              }

              const selected = country.id === selectedAtk;
              const color = countryColor(country);

              return (
                <g
                  key={country.id}
                  transform={`translate(${position.x} ${position.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${country.name}, ${country.soldiers} soldiers`}
                  aria-pressed={selected}
                  onClick={() => onCountryClick(country.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onCountryClick(country.id);
                    }
                  }}
                  className="army-marker"
                >
                  <title>
                    {`${country.name}: ${country.soldiers} soldiers`}
                  </title>

                  <circle
                    r="14"
                    fill="#07111e"
                    stroke={selected ? "#ffffff" : color}
                    strokeWidth={selected ? 3 : 2}
                  />

                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight="800"
                    pointerEvents="none"
                  >
                    {country.soldiers}
                  </text>
                </g>
              );
            })}

            {from && to && conquestAnimation && (
              <g
                key={`${conquestAnimation.fromId}-${conquestAnimation.toId}`}
                className="battle-visuals"
                pointerEvents="none"
                aria-hidden="true"
              >
                <path
                  d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                  fill="none"
                  stroke={invasionColor}
                  strokeWidth="2"
                  strokeDasharray="5 8"
                  opacity="0.5"
                />

                {/* Bounded troop count avoids hundreds of DOM elements. */}
                {Array.from({ length: 18 }, (_, index) => {
                  const lane = ((index % 3) - 1) * 4;

                  const route =
                    `M ${from.x} ${from.y + lane} ` +
                    `L ${to.x} ${to.y + lane}`;

                  return (
                    <circle
                      key={index}
                      r="3"
                      fill={invasionColor}
                      stroke="#ffffff"
                      strokeWidth="0.4"
                      opacity="0"
                    >
                      <animateMotion
                        path={route}
                        begin={`${index * 0.04}s`}
                        dur="1.5s"
                        fill="freeze"
                      />

                      <animate
                        attributeName="opacity"
                        values="0;1;1;0"
                        keyTimes="0;0.1;0.85;1"
                        begin={`${index * 0.04}s`}
                        dur="1.5s"
                        fill="freeze"
                      />
                    </circle>
                  );
                })}

                {/* Plane travels to a point directly above the target. */}
                <g>
                  <animateMotion
                    path={flightPath}
                    dur="1.4s"
                    fill="freeze"
                  />

                  <path
                    d="M 0 -10 L 3 -2 L 12 3 L 12 6 L 3 4 L 2 10 L -2 10 L -3 4 L -12 6 L -12 3 L -3 -2 Z"
                    fill="#e7eef6"
                    stroke="#07111e"
                    strokeWidth="1"
                  />

                  <animate
                    attributeName="opacity"
                    values="1;1;0"
                    keyTimes="0;0.9;1"
                    dur="1.8s"
                    fill="freeze"
                  />
                </g>

                {/* Bomb appears only after the plane reaches the target. */}
                <ellipse
                  cx={to.x}
                  cy={to.y - 22}
                  rx="2.5"
                  ry="5"
                  fill="#ffce75"
                  opacity="0"
                >
                  <animate
                    attributeName="cy"
                    from={to.y - 22}
                    to={to.y}
                    begin="1.4s"
                    dur="0.4s"
                    fill="freeze"
                  />

                  <animate
                    attributeName="opacity"
                    values="0;1;1;0"
                    keyTimes="0;0.05;0.95;1"
                    begin="1.4s"
                    dur="0.4s"
                    fill="freeze"
                  />
                </ellipse>

                <circle
                  cx={to.x}
                  cy={to.y}
                  r="3"
                  fill="#ffb14a"
                  opacity="0"
                >
                  <animate
                    attributeName="r"
                    from="3"
                    to="22"
                    begin="1.8s"
                    dur="0.55s"
                    fill="freeze"
                  />

                  <animate
                    attributeName="opacity"
                    values="0;0.85;0"
                    begin="1.8s"
                    dur="0.55s"
                    fill="freeze"
                  />
                </circle>

                <circle
                  cx={to.x}
                  cy={to.y}
                  r="5"
                  fill="none"
                  stroke="#ffe1a0"
                  strokeWidth="2"
                  opacity="0"
                >
                  <animate
                    attributeName="r"
                    from="5"
                    to="34"
                    begin="1.8s"
                    dur="0.7s"
                    fill="freeze"
                  />

                  <animate
                    attributeName="opacity"
                    values="0;1;0"
                    begin="1.8s"
                    dur="0.7s"
                    fill="freeze"
                  />
                </circle>
              </g>
            )}
          </g>
        </svg>

        <div className="map-caption">
          Select countries above or on the map.
          Zoom centres on your selected country.
        </div>
      </div>

      {missingCountries.length > 0 && (
        <p className="map-warning" role="status">
          Coordinates are not yet configured for:{" "}
          {missingCountries.map((country) => country.name).join(", ")}.
        </p>
      )}

      <style jsx>{`
        .world-panel {
          width: 100%;
          min-width: 0;
          padding: 16px;
          box-sizing: border-box;
          color: #e7eef7;
          background: #091321;
          border: 1px solid #29394c;
          border-radius: 18px;
        }

        .command-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }

        .eyebrow {
          margin: 0 0 4px;
          color: #e9bf69;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
        }

        h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
        }

        .country-total {
          color: #9eb1c5;
          font-size: 12px;
        }

        .country-list {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 14px;
        }

        .country-card {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          min-height: 48px;
          padding: 9px;
          color: #e7eef7;
          text-align: left;
          background: #111f30;
          border: 1px solid #293d54;
          border-radius: 10px;
          cursor: pointer;
        }

        .country-card:hover,
        .country-card.selected {
          background: #263044;
          border-color: #e9bf69;
        }

        .country-card:focus-visible,
        .map-toolbar button:focus-visible {
          outline: 2px solid #ffe2a0;
          outline-offset: 3px;
        }

        .flag {
          flex-shrink: 0;
          font-family:
            "Apple Color Emoji",
            "Segoe UI Emoji",
            "Noto Color Emoji",
            sans-serif;
          font-size: 22px;
          line-height: 1;
        }

        .country-name {
          min-width: 0;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .soldier-count {
          margin-left: auto;
          font-size: 14px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        .map-frame {
          position: relative;
          overflow: hidden;
          background: #081725;
          border: 1px solid #294057;
          border-radius: 12px;
        }

        .world-svg {
          display: block;
          width: 100%;
          height: auto;
        }

        .map-toolbar {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 2;
          display: flex;
          gap: 4px;
        }

        .map-toolbar button {
          min-width: 38px;
          min-height: 38px;
          color: #f2dfb3;
          background: #091523;
          border: 1px solid #526175;
          border-radius: 7px;
          cursor: pointer;
        }

        .map-toolbar button:disabled {
          opacity: 0.4;
          cursor: default;
        }

        .army-marker {
          cursor: pointer;
        }

        .army-marker:focus-visible {
          outline: none;
        }

        .army-marker:focus-visible circle {
          stroke: #ffffff;
          stroke-width: 4;
        }

        .map-status {
          position: absolute;
          inset: 0;
          z-index: 3;
          display: grid;
          place-items: center;
          padding: 24px;
          color: #c5d5e6;
          text-align: center;
          background: #081725;
        }

        .error,
        .map-warning {
          color: #ffb6a5;
        }

        .map-warning {
          font-size: 12px;
        }

        .map-caption {
          padding: 9px 12px;
          color: #9eb1c5;
          font-size: 11px;
          text-align: center;
          background: #0c1828;
        }

        @media (max-width: 1000px) {
          .country-list {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .world-panel {
            padding: 10px;
          }

          .country-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .country-card {
            padding: 8px;
          }

          h2 {
            font-size: 19px;
          }

          .map-toolbar {
            top: 5px;
            left: 5px;
          }

          .map-toolbar button {
            min-width: 32px;
            min-height: 32px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .battle-visuals {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}