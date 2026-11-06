
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
      await BattleCommentary.publish(id, revision);
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

const revision = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);

const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("diplomacy"),
    targetId: z
      .string()
      .regex(/^(human|npc:[a-z]{2})$/),
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

const requestSchema = z.discriminatedUnion(
  "operation",
  [
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
      operation: z.literal("human-action"),
      id: z.string().uuid(),
      expectedRevision: revision,
      action: actionSchema,
    }).strict(),

    z.object({
      operation: z.literal("npc-step"),
      id: z.string().uuid(),
      expectedRevision: revision,
    }).strict(),
  ],
);

function json(
  body: unknown,
  status = 200,
  timing?: string,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(timing
        ? { "Server-Timing": timing }
        : {}),
    },
  });
}

export async function POST(
  request: Request,
): Promise<Response> {
  const started = performance.now();
  let authMs = 0;
  let databaseMs = 0;

  const respond = (
    body: unknown,
    status = 200,
  ): Response => {
    const timing = [
      `auth;dur=${authMs.toFixed(1)}`,
      `database;dur=${databaseMs.toFixed(1)}`,
      `total;dur=${(
        performance.now() - started
      ).toFixed(1)}`,
    ].join(", ");

    return json(body, status, timing);
  };

  async function database<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    const begin = performance.now();

    try {
      return await operation();
    } finally {
      databaseMs += performance.now() - begin;
    }
  }

  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return respond(
        {
          error: "Sign in before making a move.",
        },
        401,
      );
    }

    const token = authorization
      .slice(7)
      .trim();

    if (!token || token.length > 10_000) {
      return respond(
        {
          error: "Invalid authentication.",
        },
        401,
      );
    }

    const { adminAuth } = getAdminServices();

    let playerId: string;
    const authStarted = performance.now();

    try {
      // Keep revocation checks enabled.
      const decoded =
        await adminAuth.verifyIdToken(token, true);

      // Ownership comes from verified identity,
      // never from a player ID supplied by the browser.
      playerId = decoded.uid;
      authMs = performance.now() - authStarted;
    } catch (error) {
      const rawCode =
        error !== null &&
        typeof error === "object" &&
        "code" in error
          ? String(error.code)
          : "unknown";

      const code =
        /^[a-z-]+\/[a-z-]+$/.test(rawCode)
          ? rawCode
          : "unknown";

      authMs = performance.now() - authStarted;

      const expired =
        code === "auth/id-token-expired";

      const invalid =
        expired ||
        [
          "auth/id-token-revoked",
          "auth/invalid-id-token",
          "auth/argument-error",
          "auth/user-disabled",
          "auth/user-not-found",
          "auth/tenant-id-mismatch",
        ].includes(code);

      // Log only the SDK code.
      // Never log tokens, keys or raw provider errors.
      console.error(
        "Campaign token verification failed:",
        code,
      );

      return respond(
        {
          error: expired
            ? "Your session expired. Retry to refresh it."
            : invalid
              ? "Your session is invalid. Sign out and sign in again."
              : "The server could not verify your session. Check the server authentication configuration or try again shortly.",

          code: expired
            ? "SESSION_EXPIRED"
            : invalid
              ? "SIGN_IN_REQUIRED"
              : "AUTH_SERVICE_UNAVAILABLE",
        },
        invalid ? 401 : 503,
      );
    }

    const contentType =
      request.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return respond(
        {
          error: "Send an application/json request.",
        },
        415,
      );
    }

    // Read at most 16 KiB.
    // Reject oversized bodies before JSON parsing.
    const reader = request.body?.getReader();

    if (!reader) {
      return respond(
        {
          error: "The request body is missing.",
        },
        400,
      );
    }

    const chunks: Uint8Array[] = [];
    let bytes = 0;

    while (true) {
      const chunk = await reader.read();

      if (chunk.done) break;

      bytes += chunk.value.byteLength;

      if (bytes > 16_384) {
        await reader.cancel();

        return respond(
          {
            error: "The request body is too large.",
          },
          413,
        );
      }

      chunks.push(chunk.value);
    }

    const buffer = new Uint8Array(bytes);
    let offset = 0;

    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    let raw: unknown;

    try {
      raw = JSON.parse(
        new TextDecoder().decode(buffer),
      );
    } catch {
      return respond(
        {
          error: "Invalid JSON.",
        },
        400,
      );
    }

    const parsed =
      requestSchema.safeParse(raw);

    if (!parsed.success) {
      return respond(
        {
          error: "The campaign request is invalid.",
        },
        400,
      );
    }

    const input = parsed.data;

    if (input.operation === "delete") {
      await database(() =>
        CampaignRepository.remove(
          input.id,
          playerId,
        ),
      );

      return respond({
        deleted: true,
      });
    }

    if (input.operation === "create") {
      const state = await database(() =>
        CampaignRepository.create({
          id: input.id,
          playerId,
          selectedCountryId:
            input.selectedCountryId,
          difficulty: input.difficulty,
        }),
      );

      return respond({ state });
    }

    if (input.operation === "npc-step") {
      const result = await database(() =>
        CampaignRepository.execute({
          id: input.id,
          playerId,
          expectedRevision:
            input.expectedRevision,
          mode: "npc",
        }),
      );

      if (result.event.dice) {
        publishCommentary(
          input.id,
          result.event.revision,
        );
      }

      return respond(result);
    }

    const result = await database(() =>
      CampaignRepository.execute({
        id: input.id,
        playerId,
        expectedRevision:
          input.expectedRevision,
        mode: "human",
        action: input.action,
      }),
    );

    if (result.event.dice) {
      publishCommentary(
        input.id,
        result.event.revision,
      );
    }

    return respond(result);
  } catch (error) {
    if (error instanceof CampaignRequestError) {
      return respond(
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

    return respond(
      {
        error:
          "The server could not complete this action.",
      },
      500,
    );
  }
}

// import { z } from "zod";
// import { after } from "next/server";

// import { BattleCommentary } from "../../../lib/ai/BattleCommentary";

// import { getAdminServices } from "../../../lib/firebase/admin";

// import {
//   CampaignRepository,
//   CampaignRequestError,
// } from "../../../lib/db/CampaignRepository";

// export const runtime = "nodejs";
// export const maxDuration = 30;

// function publishCommentary(
//   id: string,
//   revision: number,
// ): void {
//   after(async () => {
//     try {
//       await BattleCommentary.publish(
//         id,
//         revision,
//       );
//     } catch (error) {
//       console.error(
//         "Commentary publication failed:",

//         error instanceof Error
//           ? error.name
//           : "UnknownError",
//       );
//     }
//   });
// }

// const countryId = z
//   .string()
//   .regex(/^[a-z]{2}$/);

// const soldierAmount = z
//   .number()
//   .int()
//   .min(0)
//   .max(Number.MAX_SAFE_INTEGER);

// const actionSchema =
//   z.discriminatedUnion("type", [
//     z.object({
//       type: z.literal("diplomacy"),
//       targetId: z.string().regex(/^(human|npc:[a-z]{2})$/),
//       operation: z.enum(["offer", "break"]),
//     }).strict(),
//     z.object({
//       type: z.literal("allocate"),

//       allocations: z.record(
//         countryId,
//         soldierAmount,
//       ),
//     }).strict(),

//     z.object({
//       type: z.literal("transfer"),
//       fromId: countryId,
//       toId: countryId,

//       amount: z
//         .number()
//         .int()
//         .min(1)
//         .max(Number.MAX_SAFE_INTEGER),
//     }).strict(),

//     z.object({
//       type: z.literal("start-attack"),
//       fromId: countryId,
//       toId: countryId,
//     }).strict(),

//     z.object({
//       type: z.literal("roll"),
//     }).strict(),

//     z.object({
//       type: z.literal("stop-attack"),
//     }).strict(),

//     z.object({
//       type: z.literal("end-turn"),
//     }).strict(),
//   ]);

// const revision = z
//   .number()
//   .int()
//   .min(0)
//   .max(Number.MAX_SAFE_INTEGER);

// const requestSchema =
//   z.discriminatedUnion("operation", [
//     z.object({
//       operation: z.literal("delete"),
//       id: z.string().uuid(),
//     }).strict(),

//     z.object({
//       operation: z.literal("create"),
//       id: z.string().uuid(),
//       selectedCountryId: countryId,

//       difficulty: z.enum([
//         "easy",
//         "normal",
//         "hard",
//       ]),
//     }).strict(),

//     z.object({
//       operation:
//         z.literal("human-action"),

//       id: z.string().uuid(),
//       expectedRevision: revision,
//       action: actionSchema,
//     }).strict(),

//     z.object({
//       operation:
//         z.literal("npc-step"),

//       id: z.string().uuid(),
//       expectedRevision: revision,
//     }).strict(),
//   ]);

// function json(
//   body: unknown,
//   status = 200,
//   timing?: string,
// ): Response {
//   return Response.json(body, {
//     status,

//     headers: {
//       "Cache-Control": "no-store",
//       ...(timing ? { "Server-Timing": timing } : {}),

//       "X-Content-Type-Options":
//         "nosniff",
//     },
//   });
// }

// export async function POST(
//   request: Request,
// ): Promise<Response> {
//   const started = performance.now();
//   let authMs = 0, databaseMs = 0;

//   const respond = (body: unknown, status = 200) => json(
//     body,
//     status,
//     `auth;dur=${authMs.toFixed(1)}, database;dur=${databaseMs.toFixed(1)}, total;dur=${(performance.now()-started).toFixed(1)}`
//   );

//   async function database<T>(
//     operation: () => Promise<T>
//   ): Promise<T> {
//     const begin = performance.now();
//     try {
//       return await operation();
//     } finally {
//       databaseMs += performance.now() - begin;
//     }
//   }

//   try {
//     const authorization =
//       request.headers.get(
//         "authorization",
//       );

//     if (
//       !authorization?.startsWith(
//         "Bearer ",
//       )
//     ) {
//       return respond(
//         {
//           error:
//             "Sign in before making a move.",
//         },
//         401,
//       );
//     }

//     const token = authorization
//       .slice(7)
//       .trim();

//     if (
//       !token ||
//       token.length > 10_000
//     ) {
//       return respond(
//         {
//           error:
//             "Invalid authentication.",
//         },
//         401,
//       );
//     }

//     const { adminAuth } =
//       getAdminServices();

//     let playerId: string;
//     const authStarted = performance.now();

//     try {
//       const decoded =
//         await adminAuth.verifyIdToken(
//           token,
//           true,
//         );

//       playerId = decoded.uid;
//       authMs = performance.now() - authStarted;
//     } catch {
//       return respond(
//         {
//           error:
//             "Your session is invalid. Sign in again.",
//         },
//         401,
//       );
//     }

//     const contentType =
//       request.headers.get(
//         "content-type",
//       ) ?? "";

//     if (
//       !contentType.includes(
//         "application/json",
//       )
//     ) {
//       return respond(
//         {
//           error:
//             "Send an application/json request.",
//         },
//         415,
//       );
//     }

//     /*
//      * Read at most 16 KiB.
//      * Reject oversized bodies before parsing.
//      */
//     const reader =
//       request.body?.getReader();

//     if (!reader) {
//       return respond(
//         {
//           error:
//             "The request body is missing.",
//         },
//         400,
//       );
//     }

//     const chunks: Uint8Array[] = [];
//     let bytes = 0;

//     while (true) {
//       const chunk =
//         await reader.read();

//       if (chunk.done) break;

//       bytes +=
//         chunk.value.byteLength;

//       if (bytes > 16_384) {
//         await reader.cancel();

//         return respond(
//           {
//             error:
//               "The request body is too large.",
//           },
//           413,
//         );
//       }

//       chunks.push(chunk.value);
//     }

//     const buffer =
//       new Uint8Array(bytes);

//     let offset = 0;

//     for (const chunk of chunks) {
//       buffer.set(chunk, offset);
//       offset += chunk.byteLength;
//     }

//     let raw: unknown;

//     try {
//       raw = JSON.parse(
//         new TextDecoder().decode(
//           buffer,
//         ),
//       );
//     } catch {
//       return respond(
//         {
//           error: "Invalid JSON.",
//         },
//         400,
//       );
//     }

//     const parsed =
//       requestSchema.safeParse(raw);

//     if (!parsed.success) {
//       return respond(
//         {
//           error:
//             "The campaign request is invalid.",
//         },
//         400,
//       );
//     }

//     const input = parsed.data;

//     if (
//       input.operation === "delete"
//     ) {
//       await database(() => CampaignRepository.remove(input.id, playerId));

//       return respond({
//         deleted: true,
//       });
//     }

//     if (
//       input.operation === "create"
//     ) {
//       const state =
//         await database(() => CampaignRepository.create({
//           id: input.id,
//           playerId,

//           selectedCountryId:
//             input.selectedCountryId,

//           difficulty:
//             input.difficulty,
//         }));

//       return respond({ state });
//     }

//     if (
//       input.operation === "npc-step"
//     ) {
//       const result =
//         await database(() => CampaignRepository.execute({
//           id: input.id,
//           playerId,

//           expectedRevision:
//             input.expectedRevision,

//           mode: "npc",
//         }));

//       if (result.event.dice) {
//         publishCommentary(
//           input.id,
//           result.event.revision,
//         );
//       }

//       return respond(result);
//     }

//     const result =
//       await database(() => CampaignRepository.execute({
//         id: input.id,
//         playerId,

//         expectedRevision:
//           input.expectedRevision,

//         mode: "human",
//         action: input.action,
//       }));

//     if (result.event.dice) {
//       publishCommentary(
//         input.id,
//         result.event.revision,
//       );
//     }

//     return respond(result);
//   } catch (error) {
//     if (
//       error instanceof
//       CampaignRequestError
//     ) {
//       return respond(
//         {
//           error: error.message,
//         },
//         error.status,
//       );
//     }

//     console.error(
//       "Campaign API failed:",

//       error instanceof Error
//         ? error.name
//         : "UnknownError",
//     );

//     return respond(
//       {
//         error:
//           "The server could not complete this action.",
//       },
//       500,
//     );
//   }
// }