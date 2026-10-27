"use client";

import "./CountryBar.css";

type CountryBarCountry = {
  id: string;
  name: string;
  soldiers: number;
};

type CountryBarProps = {
  countries: CountryBarCountry[];
  selectedCountryId?: string | null;
  onCountryClick: (country: CountryBarCountry) => void;
};

/**
 * Converts a two-letter country code into a flag emoji.
 *
 * Examples:
 * ZA → 🇿🇦
 * US → 🇺🇸
 * BR → 🇧🇷
 *
 * No image files or network requests are required.
 */
export function countryCodeToFlag(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) {
    return "🌐";
  }

  return String.fromCodePoint(
    ...Array.from(code, (letter) => {
      return 127397 + letter.charCodeAt(0);
    }),
  );
}

export default function CountryBar({
  countries,
  selectedCountryId,
  onCountryClick,
}: CountryBarProps) {
  return (
    <nav className="country-bar" aria-label="Countries on the battlefield">
      <div className="country-bar__heading">
        <span className="country-bar__indicator" aria-hidden="true" />
        <span>WORLD COMMAND</span>

        <span className="country-bar__total">
          {countries.length} countries
        </span>
      </div>

      <div className="country-bar__countries">
        {countries.map((country) => {
          const selected = country.id === selectedCountryId;

          return (
            <button
              key={country.id}
              type="button"
              className={[
                "country-bar__country",
                selected ? "country-bar__country--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onCountryClick(country)}
              aria-pressed={selected}
              aria-label={`${country.name}, ${country.soldiers} soldiers`}
            >
              <span className="country-bar__flag" aria-hidden="true">
                {countryCodeToFlag(country.id)}
              </span>

              <span className="country-bar__name">
                {country.name}
              </span>

              <span
                className="country-bar__army"
                title={`${country.soldiers} soldiers`}
              >
                <span aria-hidden="true">♟</span>
                {country.soldiers}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}