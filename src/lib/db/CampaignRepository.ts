import "server-only";

import { randomInt } from "node:crypto";

import { getAdminServices } from "../firebase/admin";
import { CampaignEngine } from "../engine/CampaignEngine";
import { NpcStrategy } from "../engine/NpcStrategy";

import {
  COUNTRY_CATALOGUE,
  POPULATION_SOURCE,
} from "../../data/country-catalogue";

import type {
  CampaignAction,
  CampaignEvent,
  CampaignState,
  Difficulty,
} from "../../types/game-state";

export class CampaignRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CampaignRequestError";
  }
}

export interface SavedCampaignEvent
  extends CampaignEvent {
  reason: string | null;
  fromId: string | null;
  toId: string | null;
}

export class CampaignRepository {
  static async remove(
    id: string,
    playerId: string,
  ): Promise<void> {
    const { adminDb } = getAdminServices();

    const reference = adminDb
      .collection("campaigns")
      .doc(id);

    await adminDb.runTransaction(
      async (transaction) => {
        const snapshot =
          await transaction.get(reference);

        if (!snapshot.exists) {
          throw new CampaignRequestError(
            "Campaign not found.",
            404,
          );
        }

        if (
          snapshot.data()?.state?.playerId !==
          playerId
        ) {
          throw new CampaignRequestError(
            "Only the campaign owner can delete it.",
            403,
          );
        }

        /*
         * Prevent moves while the campaign and its
         * history are being removed.
         */
        transaction.update(reference, {
          deleting: true,
        });
      },
    );

    /*
     * Deleting only the parent document would leave
     * Firestore subcollections behind.
     */
    await adminDb.recursiveDelete(reference);
  }

  private static randomInteger(
    maximum: number,
  ): number {
    return randomInt(maximum);
  }

  static async create(input: {
    id: string;
    playerId: string;
    selectedCountryId: string;
    difficulty: Difficulty;
  }): Promise<CampaignState> {
    const { adminDb } = getAdminServices();

    const reference = adminDb
      .collection("campaigns")
      .doc(input.id);

    /*
     * Repeating a creation request with the same ID
     * returns the existing owned campaign.
     */
    return adminDb.runTransaction(
      async (transaction) => {
        const existing =
          await transaction.get(reference);

        if (existing.exists) {
          if (existing.data()?.deleting) {
            throw new CampaignRequestError(
              "This campaign is being deleted.",
              409,
            );
          }

          const state =
            existing.data()?.state as
              | CampaignState
              | undefined;

          if (
            !state ||
            state.playerId !== input.playerId
          ) {
            throw new CampaignRequestError(
              "This campaign ID is unavailable.",
              409,
            );
          }

          return state;
        }

        const state = CampaignEngine.create(
          {
            id: input.id,
            playerId: input.playerId,

            selectedCountryId:
              input.selectedCountryId,

            countryPool: COUNTRY_CATALOGUE,
            difficulty: input.difficulty,
          },

          this.randomInteger,
          Date.now(),
        );

        transaction.create(reference, {
          state,
          lastEvent: null,
          nextActionAt: 0,
          populationSource: POPULATION_SOURCE,
        });

        transaction.create(
          reference.collection("events").doc("0"),

          {
            revision: 0,
            actorId: "system",
            action: "setup",
            message: "Campaign created.",
            createdAt: state.createdAt,
            dice: null,
            reason: null,
            fromId: null,
            toId: null,
            afterState: state,
          },
        );

        return state;
      },
    );
  }

  static async execute(input: {
    id: string;
    playerId: string;
    expectedRevision: number;
    mode: "human" | "npc";
    action?: CampaignAction;
  }): Promise<{
    state: CampaignState;
    event: SavedCampaignEvent;
  }> {
    const { adminDb } = getAdminServices();

    const reference = adminDb
      .collection("campaigns")
      .doc(input.id);

    return adminDb.runTransaction(
      async (transaction) => {
        const snapshot =
          await transaction.get(reference);

        if (!snapshot.exists) {
          throw new CampaignRequestError(
            "Campaign not found.",
            404,
          );
        }

        const document = snapshot.data();

        if (document?.deleting) {
          throw new CampaignRequestError(
            "This campaign is being deleted.",
            409,
          );
        }

        const state = document?.state as
          | CampaignState
          | undefined;

        if (
          !state ||
          state.schemaVersion !== 1
        ) {
          throw new CampaignRequestError(
            "This campaign uses an unsupported format.",
            409,
          );
        }

        if (
          state.playerId !== input.playerId
        ) {
          throw new CampaignRequestError(
            "Only the campaign owner can make moves.",
            403,
          );
        }

        if (
          state.revision !==
          input.expectedRevision
        ) {
          throw new CampaignRequestError(
            "The board has changed. Use its latest state.",
            409,
          );
        }

        const now = Date.now();

        const nextActionAt =
          typeof document?.nextActionAt ===
          "number"
            ? document.nextActionAt
            : 0;

        if (now < nextActionAt) {
          throw new CampaignRequestError(
            "Please wait briefly before the next action.",
            429,
          );
        }

        const actorId =
          CampaignEngine.currentActor(state);

        const participant =
          state.participants.find(
            (item) => item.id === actorId,
          );

        if (!participant) {
          throw new CampaignRequestError(
            "The current participant is invalid.",
            409,
          );
        }

        let action: CampaignAction;
        let reason: string | null = null;

        if (input.mode === "npc") {
          if (
            participant.kind !== "npc"
          ) {
            throw new CampaignRequestError(
              "It is the human player's turn.",
              409,
            );
          }

          const decision =
            NpcStrategy.choose(state);

          action = decision.action;
          reason = decision.reason;
        } else {
          if (
            participant.kind !== "human" ||
            !input.action
          ) {
            throw new CampaignRequestError(
              "It is not the human player's turn.",
              409,
            );
          }

          action = input.action;
        }

        let result;

        try {
          result = CampaignEngine.apply(
            state,
            actorId,
            action,
            this.randomInteger,
            now,
          );
        } catch (error) {
          throw new CampaignRequestError(
            error instanceof Error
              ? error.message
              : "The action is invalid.",
            400,
          );
        }

        const event: SavedCampaignEvent = {
          ...result.event,
          reason,

          fromId:
            state.activeAttack
              ?.attackerCountryId ??
            (
              (action.type === "start-attack" || action.type === "transfer")
                ? action.fromId
                : null
            ),

          toId:
            state.activeAttack
              ?.defenderCountryId ??
            (
              (action.type === "start-attack" || action.type === "transfer")
                ? action.toId
                : null
            ),
        };

        /*
         * The board and history event are saved
         * together in the same transaction.
         */
        transaction.update(reference, {
          state: result.state,
          lastEvent: event,
          nextActionAt: now + 300,
        });

        transaction.create(
          reference
            .collection("events")
            .doc(
              String(result.state.revision),
            ),

          {
            ...event,
            afterState: result.state,
          },
        );

        return {
          state: result.state,
          event,
        };
      },
    );
  }
}