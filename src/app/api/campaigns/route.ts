import { z } from "zod";
import { after } from "next/server";

import { BattleCommentary } from "../../../lib/ai/BattleCommentary";

import { getAdminServices } from "../../../lib/firebase/admin";

import {
  CampaignRepository,
  CampaignRequestError,
} from "../../../lib/db/CampaignRepository";

export const runtime = "nodejs";
export const maxDuration = 30;

function publishCommentary(
  id: string,
  revision: number,
): void {
  after(async () => {
    try {
      await BattleCommentary.publish(
        id,
        revision,
      );
    } catch (error) {
      console.error(
        "Commentary publication failed:",

        error instanceof Error
          ? error.name
          : "UnknownError",
      );
    }
  });
}

const countryId = z
  .string()
  .regex(/^[a-z]{2}$/);

const soldierAmount = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);

const actionSchema =
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("diplomacy"),
      targetId: z.string().regex(/^(human|npc:[a-z]{2})$/),
      operation: z.enum(["offer", "break"]),
    }).strict(),
    z.object({
      type: z.literal("allocate"),

      allocations: z.record(
        countryId,
        soldierAmount,
      ),
    }).strict(),

    z.object({
      type: z.literal("transfer"),
      fromId: countryId,
      toId: countryId,

      amount: z
        .number()
        .int()
        .min(1)
        .max(Number.MAX_SAFE_INTEGER),
    }).strict(),

    z.object({
      type: z.literal("start-attack"),
      fromId: countryId,
      toId: countryId,
    }).strict(),

    z.object({
      type: z.literal("roll"),
    }).strict(),

    z.object({
      type: z.literal("stop-attack"),
    }).strict(),

    z.object({
      type: z.literal("end-turn"),
    }).strict(),
  ]);

const revision = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);

const requestSchema =
  z.discriminatedUnion("operation", [
    z.object({
      operation: z.literal("delete"),
      id: z.string().uuid(),
    }).strict(),

    z.object({
      operation: z.literal("create"),
      id: z.string().uuid(),
      selectedCountryId: countryId,

      difficulty: z.enum([
        "easy",
        "normal",
        "hard",
      ]),
    }).strict(),

    z.object({
      operation:
        z.literal("human-action"),

      id: z.string().uuid(),
      expectedRevision: revision,
      action: actionSchema,
    }).strict(),

    z.object({
      operation:
        z.literal("npc-step"),

      id: z.string().uuid(),
      expectedRevision: revision,
    }).strict(),
  ]);

function json(
  body: unknown,
  status = 200,
): Response {
  return Response.json(body, {
    status,

    headers: {
      "Cache-Control": "no-store",

      "X-Content-Type-Options":
        "nosniff",
    },
  });
}

export async function POST(
  request: Request,
): Promise<Response> {
  try {
    const authorization =
      request.headers.get(
        "authorization",
      );

    if (
      !authorization?.startsWith(
        "Bearer ",
      )
    ) {
      return json(
        {
          error:
            "Sign in before making a move.",
        },
        401,
      );
    }

    const token = authorization
      .slice(7)
      .trim();

    if (
      !token ||
      token.length > 10_000
    ) {
      return json(
        {
          error:
            "Invalid authentication.",
        },
        401,
      );
    }

    const { adminAuth } =
      getAdminServices();

    let playerId: string;

    try {
      const decoded =
        await adminAuth.verifyIdToken(
          token,
          true,
        );

      playerId = decoded.uid;
    } catch {
      return json(
        {
          error:
            "Your session is invalid. Sign in again.",
        },
        401,
      );
    }

    const contentType =
      request.headers.get(
        "content-type",
      ) ?? "";

    if (
      !contentType.includes(
        "application/json",
      )
    ) {
      return json(
        {
          error:
            "Send an application/json request.",
        },
        415,
      );
    }

    /*
     * Read at most 16 KiB.
     * Reject oversized bodies before parsing.
     */
    const reader =
      request.body?.getReader();

    if (!reader) {
      return json(
        {
          error:
            "The request body is missing.",
        },
        400,
      );
    }

    const chunks: Uint8Array[] = [];
    let bytes = 0;

    while (true) {
      const chunk =
        await reader.read();

      if (chunk.done) break;

      bytes +=
        chunk.value.byteLength;

      if (bytes > 16_384) {
        await reader.cancel();

        return json(
          {
            error:
              "The request body is too large.",
          },
          413,
        );
      }

      chunks.push(chunk.value);
    }

    const buffer =
      new Uint8Array(bytes);

    let offset = 0;

    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    let raw: unknown;

    try {
      raw = JSON.parse(
        new TextDecoder().decode(
          buffer,
        ),
      );
    } catch {
      return json(
        {
          error: "Invalid JSON.",
        },
        400,
      );
    }

    const parsed =
      requestSchema.safeParse(raw);

    if (!parsed.success) {
      return json(
        {
          error:
            "The campaign request is invalid.",
        },
        400,
      );
    }

    const input = parsed.data;

    if (
      input.operation === "delete"
    ) {
      await CampaignRepository.remove(
        input.id,
        playerId,
      );

      return json({
        deleted: true,
      });
    }

    if (
      input.operation === "create"
    ) {
      const state =
        await CampaignRepository.create({
          id: input.id,
          playerId,

          selectedCountryId:
            input.selectedCountryId,

          difficulty:
            input.difficulty,
        });

      return json({ state });
    }

    if (
      input.operation === "npc-step"
    ) {
      const result =
        await CampaignRepository.execute({
          id: input.id,
          playerId,

          expectedRevision:
            input.expectedRevision,

          mode: "npc",
        });

      if (result.event.dice) {
        publishCommentary(
          input.id,
          result.event.revision,
        );
      }

      return json(result);
    }

    const result =
      await CampaignRepository.execute({
        id: input.id,
        playerId,

        expectedRevision:
          input.expectedRevision,

        mode: "human",
        action: input.action,
      });

    if (result.event.dice) {
      publishCommentary(
        input.id,
        result.event.revision,
      );
    }

    return json(result);
  } catch (error) {
    if (
      error instanceof
      CampaignRequestError
    ) {
      return json(
        {
          error: error.message,
        },
        error.status,
      );
    }

    console.error(
      "Campaign API failed:",

      error instanceof Error
        ? error.name
        : "UnknownError",
    );

    return json(
      {
        error:
          "The server could not complete this action.",
      },
      500,
    );
  }
}