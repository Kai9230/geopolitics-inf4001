"use client";

import { auth } from "../firebase/config";

import type {
  CampaignAction,
  CampaignEvent,
  CampaignState,
  Difficulty,
} from "../../types/game-state";

export type CampaignResponse = {
  state: CampaignState;
  event: CampaignEvent & {
    reason?: string | null;
    fromId?: string | null;
    toId?: string | null;
  };
  cooldownMs?: number;
};

export class CampaignApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "CampaignApiError";
  }
}

export class CampaignClient {
  private static createdCampaign: CampaignState | null = null;

  static createdState(id: string): CampaignState | null {
    const state = this.createdCampaign;

    return (
      state?.id === id &&
      state.revision === 0 &&
      auth.currentUser?.uid === state.playerId
    ) ? structuredClone(state) : null;
  }

  static remove(
    id: string,
  ): Promise<{ deleted: boolean }> {
    return this.post({
      operation: "delete",
      id,
    });
  }

  private static async post<T>(
    body: unknown,
    refreshed = false,
    expectedUid?: string,
  ): Promise<T> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      throw new CampaignApiError(
        "Sign in before making a move.",
        401,
      );
    }

    if (expectedUid && user.uid !== expectedUid) {
      throw new CampaignApiError("Your account changed. Sign in again.", 401);
    }
    const token = await user.getIdToken(refreshed);
    if (auth.currentUser?.uid !== user.uid) {
      throw new CampaignApiError("Your account changed. Sign in again.", 401);
    }

    const response = await fetch(
      "/api/campaigns",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        cache: "no-store",
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();

    // Only expiration is rejected before any mutation, so only this is safe to retry.
    if (response.status === 401 && data.code === "SESSION_EXPIRED" && !refreshed) {
      if (auth.currentUser?.uid !== user.uid) {
        throw new CampaignApiError("Your account changed. Sign in again.", 401);
      }
      return this.post<T>(body, true, user.uid);
    }

    if (!response.ok) {
      throw new CampaignApiError(
        typeof data.error === "string"
          ? data.error
          : "The action could not be completed.",
        response.status,
        typeof data.code === "string" ? data.code : undefined,
      );
    }

    return data as T;
  }

  static async create(input: {
    id: string;
    selectedCountryId: string;
    difficulty: Difficulty;
  }): Promise<{ state: CampaignState }> {
    const result = await this.post<{ state: CampaignState }>({
      operation: "create",
      ...input,
    });

    this.createdCampaign = result.state;
    return result;
  }

  static act(
    state: CampaignState,
    action: CampaignAction,
  ): Promise<CampaignResponse> {
    return this.post({
      operation: "human-action",
      id: state.id,
      expectedRevision: state.revision,
      action,
    });
  }

  static advanceNpc(
    state: CampaignState,
  ): Promise<CampaignResponse> {
    return this.post({
      operation: "npc-step",
      id: state.id,
      expectedRevision: state.revision,
    });
  }
}