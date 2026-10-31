"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";


import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase/config";

import { CampaignClient } from "@/lib/api/CampaignClient";
import { BattleRules } from "@/lib/engine/BattleRules";

import { COUNTRY_CATALOGUE } from "@/data/country-catalogue";

import type {
  CampaignState,
  Difficulty,
} from "@/types/game-state";

import styles from "@/styles/Campaign.module.css";


type StatusFilter = "all" | "active" | "completed";

interface CreationAttempt {
  signature: string;
  id: string;
}

export default function LobbyPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const [campaigns, setCampaigns] = useState<
    CampaignState[]
  >([]);

  const [countryId, setCountryId] = useState("za");

  const [difficulty, setDifficulty] =
    useState<Difficulty>("normal");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const creatingRef = useRef(false);

  const creationAttempt =
    useRef<CreationAttempt | null>(null);

  /*
   * Subscribe to authentication changes.
   *
   * State updates happen inside Firebase callbacks,
   * not directly inside the effect body.
   */
  useEffect(() => {
    let active = true;
    let generation = 0;

    let stopCampaigns: (() => void) | undefined;

    const stopAuth = onAuthStateChanged(
      auth,

      (nextUser) => {
        if (!active) return;

        generation += 1;

        const subscriptionGeneration = generation;

        stopCampaigns?.();
        stopCampaigns = undefined;

        setUser(nextUser);
        setAuthReady(true);
        setCampaigns([]);
        setLoading(nextUser !== null);
        setError("");

        if (!nextUser) {
          return;
        }

        const ownedCampaigns = query(
          collection(db, "campaigns"),
          where("state.playerId", "==", nextUser.uid),
        );

        stopCampaigns = onSnapshot(
          ownedCampaigns,

          (snapshot) => {
            if (
              !active ||
              subscriptionGeneration !== generation
            ) {
              return;
            }

            const nextCampaigns = snapshot.docs
              .map(
                (item) =>
                  item.data().state as
                    | CampaignState
                    | undefined,
              )
              .filter(
                (state): state is CampaignState =>
                  state?.schemaVersion === 1,
              )
              .sort(
                (a, b) => b.updatedAt - a.updatedAt,
              );

            setCampaigns(nextCampaigns);
            setLoading(false);
          },

          (failure) => {
            if (
              !active ||
              subscriptionGeneration !== generation
            ) {
              return;
            }

            // FirestoreError has a code property.
            console.error(
              "Campaign list failed:",
              failure.code,
            );

            setError(
              "Could not load campaigns. Check your " +
                "connection and the published Firestore rules.",
            );

            setLoading(false);
          },
        );
      },

      (failure) => {
        if (!active) return;

        generation += 1;

        stopCampaigns?.();
        stopCampaigns = undefined;

        // This callback receives Error, so use message.
        console.error(
          "Authentication listener failed:",
          failure.message,
        );

        setUser(null);
        setAuthReady(true);
        setCampaigns([]);
        setLoading(false);

        setError(
          "Could not check your sign-in session. " +
            "Please refresh the page.",
        );
      },
    );

    return () => {
      active = false;
      generation += 1;

      stopAuth();
      stopCampaigns?.();
    };
  }, []);

  /*
   * Calculate values from existing state instead of
   * creating additional effects.
   */
  const selectedCountry = COUNTRY_CATALOGUE.find(
    (country) => country.id === countryId,
  );

  const selectedSoldiers = selectedCountry
    ? BattleRules.soldiersFromPopulation(
        selectedCountry.population,
      )
    : 0;

  const wins = campaigns.filter(
    (campaign) =>
      campaign.status === "completed" &&
      campaign.winnerId === "human",
  ).length;

  const activeCount = campaigns.filter(
    (campaign) => campaign.status === "active",
  ).length;

  const controlledCountries = campaigns.reduce(
    (total, campaign) =>
      total +
      campaign.countries.filter(
        (country) => country.ownerId === "human",
      ).length,
    0,
  );

  const visibleCampaigns = campaigns.filter(
    (campaign) => {
      if (
        statusFilter !== "all" &&
        campaign.status !== statusFilter
      ) {
        return false;
      }

      const startingCountry =
        campaign.participants.find(
          (participant) =>
            participant.kind === "human",
        )?.name ?? "";

      const searchable = [
        campaign.id,
        startingCountry,
        campaign.difficulty,
        campaign.status,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(
        search.trim().toLowerCase(),
      );
    },
  );

  async function createCampaign(): Promise<void> {
    if (!user || creatingRef.current) {
      return;
    }

    const ownerId = user.uid;

    creatingRef.current = true;
    setCreating(true);
    setError("");

    /*
     * Reuse the campaign ID when retrying creation
     * with the same user and settings.
     */
    const signature =
      `${ownerId}:${countryId}:${difficulty}`;

    let attempt = creationAttempt.current;

    if (
      !attempt ||
      attempt.signature !== signature
    ) {
      attempt = {
        signature,
        id: crypto.randomUUID(),
      };

      creationAttempt.current = attempt;
    }

    try {
      await CampaignClient.create({
        id: attempt.id,
        selectedCountryId: countryId,
        difficulty,
      });

      if (auth.currentUser?.uid !== ownerId) {
        return;
      }

      router.push(`/game/${attempt.id}`);
    } catch (failure) {
      if (auth.currentUser?.uid === ownerId) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not create the campaign.",
        );
      }
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }

  async function logout(): Promise<void> {
    try {
      await signOut(auth);
      router.push("/");
    } catch {
      setError(
        "Could not sign out. Please try again.",
      );
    }
  }

  if (!authReady) {
    return (
      <main className={styles.shell}>
        <p>Opening the command centre…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.shell}>
        <div className={styles.content}>
          {error && (
            <p
              className={styles.error}
              role="alert"
            >
              {error}
            </p>
          )}

          <section className={styles.panel}>
            <p className={styles.eyebrow}>
              GeoPolitics
            </p>

            <h1 className={styles.title}>
              Enter the war room
            </h1>

            <p className={styles.muted}>
              Sign in to create or resume your
              campaigns. Shared campaign links remain
              available to spectators.
            </p>

            <Link
              href="/"
              className={styles.link}
            >
              Sign in or create an account
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              GeoPolitics · Command centre
            </p>

            <h1 className={styles.title}>
              Your war room
            </h1>

            <p className={styles.muted}>
              Ten nations. One world to conquer.
            </p>
          </div>

          <button
            type="button"
            disabled={creating}
            onClick={() => void logout()}
          >
            Sign out
          </button>
        </header>

        {error && (
          <p
            className={styles.error}
            role="alert"
          >
            {error}
          </p>
        )}

        <section
          className={styles.stats}
          aria-label="Your campaign statistics"
        >
          <div className={styles.stat}>
            <span>Campaigns</span>
            <strong>{campaigns.length}</strong>
          </div>

          <div className={styles.stat}>
            <span>World victories</span>
            <strong>{wins}</strong>
          </div>

          <div className={styles.stat}>
            <span>Active campaigns</span>
            <strong>{activeCount}</strong>
          </div>

          <div className={styles.stat}>
            <span>
              Countries currently held across campaigns
            </span>

            <strong>{controlledCountries}</strong>
          </div>
        </section>

        <div className={styles.split}>
          <section className={styles.panel}>
            <h2>Launch a campaign</h2>

            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void createCampaign();
              }}
            >
              <label>
                Starting country

                <select
                  value={countryId}
                  disabled={creating}
                  onChange={(event) =>
                    setCountryId(event.target.value)
                  }
                >
                  {COUNTRY_CATALOGUE.map(
                    (country) => (
                      <option
                        key={country.id}
                        value={country.id}
                      >
                        {country.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                NPC difficulty

                <select
                  value={difficulty}
                  disabled={creating}
                  onChange={(event) =>
                    setDifficulty(
                      event.target.value as Difficulty,
                    )
                  }
                >
                  <option value="easy">
                    Easy
                  </option>

                  <option value="normal">
                    Normal
                  </option>

                  <option value="hard">
                    Hard
                  </option>
                </select>
              </label>

              {selectedCountry && (
                <div className={styles.notice}>
                  <strong>
                    {selectedCountry.name}
                  </strong>

                  <br />

                  Population:{" "}
                  {selectedCountry.population.toLocaleString(
                    "en-ZA",
                  )}

                  <br />

                  Starting soldiers: {selectedSoldiers}
                </div>
              )}

              <button
                type="submit"
                className={styles.primary}
                disabled={
                  creating || !selectedCountry
                }
              >
                {creating
                  ? "Preparing your campaign…"
                  : "Launch campaign"}
              </button>
            </form>
          </section>

          <section className={styles.panel}>
            <h2>Campaign briefing</h2>

            <p className={styles.muted}>
              Choose your nation. Nine different
              opponents are selected randomly, and
              the first participant is chosen through
              a randomized turn order.
            </p>

            <p className={styles.muted}>
              You may start one attack per turn.
              Continue rolling against that target,
              conquer it, or stop the attack and end
              your turn.
            </p>

            <p className={styles.muted}>
              From round two, receive two soldiers
              for every country you control and
              allocate them where you choose.
            </p>

            <p className={styles.muted}>
              Your campaign link allows visitors to
              watch. Only you can submit moves or
              advance its NPCs.
            </p>
          </section>
        </div>

        <section className={styles.panel}>
          <h2>Your campaigns</h2>

          <div className={styles.split}>
            <label className={styles.form}>
              Search campaigns

              <input
                type="search"
                value={search}
                placeholder={
                  "Country, difficulty, or campaign ID"
                }
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </label>

            <label className={styles.form}>
              Campaign status

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as StatusFilter,
                  )
                }
              >
                <option value="all">
                  All campaigns
                </option>

                <option value="active">
                  Active
                </option>

                <option value="completed">
                  Completed
                </option>
              </select>
            </label>
          </div>

          {loading && (
            <p className={styles.muted}>
              Loading campaigns…
            </p>
          )}

          {!loading &&
            visibleCampaigns.length === 0 && (
              <p className={styles.muted}>
                No campaigns match this view.
              </p>
            )}

          <div className={styles.campaigns}>
            {visibleCampaigns.map((campaign) => {
              const startingCountry =
                campaign.participants.find(
                  (participant) =>
                    participant.kind === "human",
                )?.name ?? "Campaign";

              const owned =
                campaign.countries.filter(
                  (country) =>
                    country.ownerId === "human",
                ).length;

              const result =
                campaign.status === "completed"
                  ? campaign.winnerId === "human"
                    ? "Victory"
                    : "NPC victory"
                  : owned === 0
                    ? "Eliminated · Watching"
                    : "Active";

              return (
                <article
                  key={campaign.id}
                  className={styles.campaignCard}
                >
                  <div>
                    <h3>{startingCountry}</h3>

                    <span className={styles.pill}>
                      {result}
                    </span>

                    <p className={styles.muted}>
                      Round {campaign.round}
                      {" · "}
                      {campaign.difficulty}
                      {" · "}
                      {owned}/10 countries

                      <br />

                      Updated{" "}
                      {new Date(
                        campaign.updatedAt,
                      ).toLocaleString("en-ZA")}
                    </p>
                  </div>

                  <Link
                    href={`/game/${campaign.id}`}
                    className={styles.link}
                  >
                    {campaign.status === "completed"
                      ? "View campaign"
                      : "Open campaign"}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}