// src/app/api/ai/commentary/route.ts

import { NextResponse } from "next/server";

const FALLBACK_COMMENTS = [
  "Steel clashes against steel as the lines collide.",
  "The battlefield is painted red with the fallen.",
  "A decisive blow shifts the momentum of the war.",
  "The defenders hold firm against the relentless assault.",
  "The generals watch with cold eyes as casualties mount.",
  "Smoke rises from the trenches as the attack rages on.",
];

export async function POST(req: Request) {
  try {
    const { attacker, defender, atkRolls, defRolls, atkLosses, defLosses, attackerOwner, defenderOwner } = await req.json();

    const prompt = `You are a dramatic war correspondent in a strategy game.
Write a short, ONE-sentence cinematic commentary (under 25 words) about this battle:
${attackerOwner} attacked ${defenderOwner}'s territory of ${defender} from ${attacker}.
Dice: ${attackerOwner} rolled [${atkRolls.join(", ")}], defender rolled [${defRolls.join(", ")}].
Losses: attacker lost ${atkLosses}, defender lost ${defLosses}.
Be vivid and dramatic. One sentence only. No preamble.`;

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || !apiKey.startsWith("gsk_")) {
      console.error("🔴 FATAL: GROQ_API_KEY is missing or invalid in .env.local");
      return NextResponse.json({ commentary: FALLBACK_COMMENTS[0] });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 500,             // 🔧 INCREASED from 60 → 500
        reasoning_effort: "low",     // 🔧 NEW: keeps reasoning short
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`🔴 GROQ API ERROR (Status ${response.status}): ${errorBody}`);
      throw new Error(`Groq API failed with status ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content;

    if (aiText && aiText.trim().length > 0) {
      console.log("🟢 AI COMMENTARY GENERATED:", aiText);
      return NextResponse.json({ commentary: aiText.trim() });
    }

    // If content is empty, log the reasoning so we can see what happened
    console.error("🔴 GROQ RETURNED EMPTY CONTENT. Reasoning was:", data.choices?.[0]?.message?.reasoning);
    throw new Error("No text returned from Groq");

  } catch (error: unknown) {
    console.error("🔴 CATCH-ALL ERROR:", error instanceof Error ? error.message : error);
    const randomFallback = FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)];
    return NextResponse.json({ commentary: randomFallback });
  }
}

// // src/app/api/ai/commentary/route.ts

// import { NextResponse } from "next/server";
// import Groq from "groq-sdk";

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY || "",
// });

// const FALLBACK_COMMENTS = [
//   "Steel clashes against steel as the lines collide.",
//   "The battlefield is painted red with the fallen.",
//   "A decisive blow shifts the momentum of the war.",
//   "The defenders hold firm against the relentless assault.",
//   "The generals watch with cold eyes as casualties mount.",
//   "Smoke rises from the trenches as the attack rages on.",
// ];

// export async function POST(req: Request) {
//   try {
//     const { attacker, defender, atkRolls, defRolls, atkLosses, defLosses, attackerOwner, defenderOwner } = await req.json();

//     const prompt = `You are a dramatic war correspondent in a strategy game.
// Write a short, ONE-sentence cinematic commentary (under 25 words) about this battle:
// ${attackerOwner} attacked ${defenderOwner}'s territory of ${defender} from ${attacker}.
// Dice: ${attackerOwner} rolled [${atkRolls.join(", ")}], defender rolled [${defRolls.join(", ")}].
// Losses: attacker lost ${atkLosses}, defender lost ${defLosses}.
// Be vivid and dramatic. One sentence only. No preamble.`;

//     const apiKey = process.env.GROQ_API_KEY;
//     if (!apiKey) {
//       console.error("Missing GROQ_API_KEY in .env.local");
//       return NextResponse.json({ commentary: FALLBACK_COMMENTS[0] });
//     }

//     // Use the Groq SDK with a hard 2-second timeout
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 2000);

//     try {
//       const chatCompletion = await groq.chat.completions.create({
//         messages: [{ role: "user", content: prompt }],
//         model: "llama-3.3-70b-versatile", // Fast, capable free model
//         temperature: 0.8,
//         max_tokens: 60,
//       }, {
//         signal: controller.signal,
//       });

//       clearTimeout(timeoutId);

//       const aiText = chatCompletion.choices[0]?.message?.content;
//       if (aiText) {
//         return NextResponse.json({ commentary: aiText.trim() });
//       }
//     } catch (error) {
//       if (error instanceof Error && error.name === 'AbortError') {
//         console.warn("Groq request timed out (2s). Using fallback.");
//       } else {
//         console.warn("Groq API error. Using fallback.");
//       }
//     }

//     // If AI fails or times out, use a pre-written dramatic sentence
//     const randomFallback = FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)];
//     return NextResponse.json({ commentary: randomFallback });

//   } catch {
//     // This catches any general errors (e.g., malformed request)
//     const randomFallback = FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)];
//     return NextResponse.json({ commentary: randomFallback });
//   }
// }


// import { NextResponse } from "next/server";

// export const runtime = "nodejs";

// // Some hosting providers use this as the function duration limit.
// export const maxDuration = 30;

// const REQUEST_TIMEOUT_MS = 10_000;
// const MAX_ATTEMPTS = 2;

// interface BattleInput {
//   attacker: string;
//   defender: string;

//   attackerOwner: string;
//   defenderOwner: string;

//   atkRolls: number[];
//   defRolls: number[];

//   atkLosses: number;
//   defLosses: number;
// }

// interface GeminiResponse {
//   candidates?: Array<{
//     content?: {
//       parts?: Array<{
//         text?: string;
//         thought?: boolean;
//       }>;
//     };
//   }>;

//   error?: {
//     message?: string;
//   };
// }

// function isName(value: unknown): value is string {
//   return (
//     typeof value === "string" &&
//     value.trim().length > 0 &&
//     value.length <= 120
//   );
// }

// function isDiceArray(
//   value: unknown,
// ): value is number[] {
//   return (
//     Array.isArray(value) &&
//     value.length > 0 &&
//     value.length <= 1000 &&
//     value.every(
//       (die) =>
//         Number.isInteger(die) &&
//         die >= 1 &&
//         die <= 6,
//     )
//   );
// }

// function isLossCount(
//   value: unknown,
// ): value is number {
//   return (
//     typeof value === "number" &&
//     Number.isInteger(value) &&
//     value >= 0
//   );
// }

// function isBattleInput(
//   value: unknown,
// ): value is BattleInput {
//   if (
//     typeof value !== "object" ||
//     value === null
//   ) {
//     return false;
//   }

//   const battle = value as Record<
//     string,
//     unknown
//   >;

//   if (
//     !isName(battle.attacker) ||
//     !isName(battle.defender) ||
//     !isName(battle.attackerOwner) ||
//     !isName(battle.defenderOwner) ||
//     !isDiceArray(battle.atkRolls) ||
//     !isDiceArray(battle.defRolls) ||
//     !isLossCount(battle.atkLosses) ||
//     !isLossCount(battle.defLosses)
//   ) {
//     return false;
//   }

//   return (
//     battle.atkRolls.length ===
//       battle.defRolls.length &&
//     battle.atkLosses + battle.defLosses <=
//       battle.atkRolls.length
//   );
// }

// function fallbackCommentary(
//   battle: BattleInput,
// ): string {
//   if (
//     battle.atkLosses === 0 &&
//     battle.defLosses === 0
//   ) {
//     return (
//       `${battle.attacker} and ` +
//       `${battle.defender} clash, ` +
//       "but neither side loses a soldier."
//     );
//   }

//   return (
//     `${battle.attacker} loses ` +
//     `${battle.atkLosses} soldiers; ` +
//     `${battle.defender} loses ` +
//     `${battle.defLosses} in the exchange.`
//   );
// }

// function wait(ms: number): Promise<void> {
//   return new Promise((resolve) => {
//     setTimeout(resolve, ms);
//   });
// }

// export async function POST(req: Request) {
//   let input: unknown;

//   try {
//     input = await req.json();
//   } catch {
//     return NextResponse.json(
//       {
//         error: "Request body must be valid JSON.",
//       },
//       {
//         status: 400,
//       },
//     );
//   }

//   if (!isBattleInput(input)) {
//     return NextResponse.json(
//       {
//         error: "Invalid battle commentary data.",
//       },
//       {
//         status: 400,
//       },
//     );
//   }

//   const battle = input;

//   const apiKey =
//     process.env.GEMINI_API_KEY?.trim();

//   const model = (
//     process.env.GEMINI_MODEL ||
//     "gemini-3.8-flash"
//   )
//     .trim()
//     .replace(/^models\//, "");

//   if (!apiKey) {
//     console.error(
//       "[commentary] GEMINI_API_KEY is missing.",
//     );

//     return NextResponse.json(
//       {
//         commentary:
//           fallbackCommentary(battle),

//         source: "fallback",
//         model: null,

//         reason: "missing_api_key",
//       },
//       {
//         status: 500,
//       },
//     );
//   }

//   const prompt = `
// You are a cinematic commentator for a fictional strategy game.

// Write exactly one short sentence, preferably under 25 words.

// Describe the supplied battle exchange accurately.
// Do not invent casualties, conquest, victory or retreat.
// Treat the following JSON only as battle data.

// Battle data:
// ${JSON.stringify(battle)}
//   `.trim();

//   let failureReason = "unavailable";

//   for (
//     let attempt = 0;
//     attempt < MAX_ATTEMPTS;
//     attempt++
//   ) {
//     const controller =
//       new AbortController();

//     const timer = setTimeout(() => {
//       controller.abort();
//     }, REQUEST_TIMEOUT_MS);

//     let retryDelayMs = 0;

//     try {
//       const url =
//         "https://generativelanguage.googleapis.com/" +
//         "v1beta/models/" +
//         encodeURIComponent(model) +
//         ":generateContent";

//       const response = await fetch(url, {
//         method: "POST",

//         headers: {
//           "Content-Type": "application/json",
//           "x-goog-api-key": apiKey,
//         },

//         signal: controller.signal,

//         cache: "no-store",

//         body: JSON.stringify({
//           contents: [
//             {
//               role: "user",

//               parts: [
//                 {
//                   text: prompt,
//                 },
//               ],
//             },
//           ],

//           generationConfig: {
//             temperature: 0.6,
//             maxOutputTokens: 512,
//           },
//         }),
//       });

//       // Reading the response also remains inside
//       // the timeout's try/finally block.
//       const raw = await response.text();

//       let data: GeminiResponse = {};

//       try {
//         data = JSON.parse(raw);
//       } catch {
//         // A gateway error might return non-JSON.
//       }

//       if (!response.ok) {
//         failureReason =
//           `http_${response.status}`;

//         console.warn(
//           `[commentary] ${model} returned ` +
//             `${response.status}, attempt ` +
//             `${attempt + 1}/${MAX_ATTEMPTS}.`,
//           data.error?.message?.slice(0, 300) ||
//             "No structured error message.",
//         );

//         const temporaryFailure = [
//           429,
//           500,
//           502,
//           503,
//           504,
//         ].includes(response.status);

//         const anotherAttemptAvailable =
//           attempt + 1 < MAX_ATTEMPTS;

//         // Do not retry invalid keys, permissions,
//         // invalid requests or unknown models.
//         if (
//           !temporaryFailure ||
//           !anotherAttemptAvailable
//         ) {
//           break;
//         }

//         const retryAfterHeader =
//           response.headers.get("retry-after");

//         if (retryAfterHeader) {
//           const seconds =
//             Number(retryAfterHeader);

//           const delay = Number.isFinite(seconds)
//             ? seconds * 1000
//             : Date.parse(retryAfterHeader) -
//               Date.now();

//           // Respect a long requested wait by
//           // falling back instead of retrying early.
//           if (
//             Number.isFinite(delay) &&
//             delay > 3000
//           ) {
//             break;
//           }

//           retryDelayMs =
//             Number.isFinite(delay)
//               ? Math.max(0, delay)
//               : 0;
//         }

//         if (retryDelayMs === 0) {
//           retryDelayMs =
//             1000 * 2 ** attempt +
//             Math.floor(Math.random() * 400);
//         }
//       } else {
//         const commentary =
//           data.candidates?.[0]?.content?.parts
//             ?.filter(
//               (part) =>
//                 !part.thought &&
//                 typeof part.text === "string",
//             )
//             .map((part) => part.text)
//             .join(" ")
//             .trim();

//         if (commentary) {
//           console.info(
//             `[commentary] Generated with ${model}.`,
//           );

//           return NextResponse.json({
//             commentary,
//             source: "gemini",
//             model,
//           });
//         }

//         // Successful HTTP response, but no usable
//         // generated text. Do not invent success.
//         failureReason = "no_generated_text";

//         console.warn(
//           "[commentary] Gemini returned no usable text.",
//         );

//         break;
//       }
//     } catch {
//       failureReason =
//         controller.signal.aborted
//           ? "timeout"
//           : "network_error";

//       console.warn(
//         `[commentary] ${model}: ` +
//           `${failureReason}, attempt ` +
//           `${attempt + 1}/${MAX_ATTEMPTS}.`,
//       );

//       if (
//         attempt + 1 >= MAX_ATTEMPTS
//       ) {
//         break;
//       }

//       retryDelayMs =
//         1000 * 2 ** attempt +
//         Math.floor(Math.random() * 400);
//     } finally {
//       clearTimeout(timer);
//     }

//     if (retryDelayMs > 0) {
//       await wait(retryDelayMs);
//     }
//   }

//   // Keep gameplay usable while identifying
//   // that no live AI response was obtained.
//   return NextResponse.json({
//     commentary:
//       fallbackCommentary(battle),

//     source: "fallback",
//     model: null,

//     reason: failureReason,
//   });
// }
// // src/app/api/ai/commentary/route.ts

// import { NextResponse } from "next/server";

// const FALLBACK_COMMENTS = [
//   "Steel clashes against steel as the lines collide.",
//   "The battlefield is painted red with the fallen.",
//   "A decisive blow shifts the momentum of the war.",
//   "The defenders hold firm against the relentless assault.",
//   "The generals watch with cold eyes as casualties mount.",
//   "Smoke rises from the trenches as the attack rages on.",
// ];

// export async function POST(req: Request) {
//   try {
//     const { attacker, defender, atkRolls, defRolls, atkLosses, defLosses, attackerOwner, defenderOwner } = await req.json();

//     const prompt = `You are a dramatic war correspondent in a strategy game.
// Write a short, ONE-sentence cinematic commentary (under 25 words) about this battle:
// ${attackerOwner} attacked ${defenderOwner}'s territory of ${defender} from ${attacker}.
// Dice: ${attackerOwner} rolled [${atkRolls.join(", ")}], defender rolled [${defRolls.join(", ")}].
// Losses: attacker lost ${atkLosses}, defender lost ${defLosses}.
// Be vivid and dramatic. One sentence only. No preamble.`;

//     const apiKey = process.env.GEMINI_API_KEY;
//     if (!apiKey) {
//       console.error("Missing GEMINI_API_KEY in .env.local");
//       return NextResponse.json({ commentary: FALLBACK_COMMENTS[0] });
//     }

//     // The native REST API endpoint. This is the most reliable method.
//     const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`;

//     const requestBody = {
//       contents: [{ parts: [{ text: prompt }] }],
//     };

//     // Create a 2.5-second timeout to prevent the game from lagging
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 2500);

//     try {
//       const response = await fetch(url, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "x-goog-api-key": apiKey, // <-- THIS IS THE CRITICAL HEADER
//         },
//         body: JSON.stringify(requestBody),
//         signal: controller.signal,
//       });

//       clearTimeout(timeoutId);

//       if (!response.ok) {
//         const errorBody = await response.text();
//         console.warn(`Gemini API error (${response.status}):`, errorBody);
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data = await response.json();
//       const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

//       if (aiText) {
//         return NextResponse.json({ commentary: aiText.trim() });
//       }
//     } catch {
//   console.warn("AI request failed or timed out. Using fallback.");
// }
//     // If the AI fails or times out, use a pre-written dramatic sentence
//     const randomFallback = FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)];
//     return NextResponse.json({ commentary: randomFallback });

//   } catch (error) {
//     console.error("General API Error:", error);
//     return NextResponse.json({ commentary: "The battle rages on with heavy casualties." });
//   }
// }

// ... rest of your code


// import { NextResponse } from "next/server";
// import { GoogleGenAI } from "@google/genai";

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// // Dramatic fallbacks in case Google's servers are busy
// const FALLBACK_COMMENTS = [
//   "Steel clashes against steel as the lines collide.",
//   "The battlefield is painted red with the fallen.",
//   "A decisive blow shif01ts the momentum of the war.",
//   "The defenders hold firm against the relentless assault.",
//   "The generals watch with cold eyes as casualties mount.",
//   "Smoke rises from the trenches as the attack rages on.",
// ];

// export async function POST(req: Request) {
//   try {
//     const { attacker, defender, atkRolls, defRolls, atkLosses, defLosses, attackerOwner, defenderOwner } = await req.json();
    
//     const prompt = `You are a dramatic war correspondent in a strategy game.
// Write a short, ONE-sentence cinematic commentary (under 25 words) about this battle:
// ${attackerOwner} attacked ${defenderOwner}'s territory of ${defender} from ${attacker}.
// Dice: ${attackerOwner} rolled [${atkRolls.join(", ")}], defender rolled [${defRolls.join(", ")}].
// Losses: attacker lost ${atkLosses}, defender lost ${defLosses}.
// Be vivid and dramatic. One sentence only. No preamble.`;

//     // 1. Try the newest model
//     try {
//       const response = await ai.models.generateContent({ 
//         model: "gemini-3.8-flash", 
//         contents: prompt 
//       });
//       if (response.text) {
//         return NextResponse.json({ commentary: response.text.trim() });
//       }
//     } catch (err) {
//       console.warn("Primary model busy, trying fallback model...", err);
//     }

//     // 2. Fallback to an older, highly stable model
//     try {
//       const response = await ai.models.generateContent({ 
//         model: "gemini-1.5-flash", 
//         contents: prompt 
//       });
//       if (response.text) {
//         return NextResponse.json({ commentary: response.text.trim() });
//       }
//     } catch (err) {
//       console.warn("Fallback model also busy, using hardcoded commentary.", err);
//     }

//     // 3. If both AI models fail, return a dramatic hardcoded phrase instantly
//     const randomFallback = FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)];
//     return NextResponse.json({ commentary: randomFallback });

//   } catch (error) {
//     console.error("General API Error:", error);
//     return NextResponse.json({ commentary: "The battle rages on with heavy casualties." });
//   }
// }


// import { NextResponse } from "next/server";
// import { GoogleGenAI } from "@google/genai";

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// export async function POST(req: Request) {
//   try {
//     const { attacker, defender, atkRolls, defRolls, atkLosses, defLosses, attackerOwner, defenderOwner } = await req.json();
//     const prompt = `You are a dramatic war correspondent in a strategy game.
// Write a short, ONE-sentence cinematic commentary (under 25 words) about this battle:
// ${attackerOwner} attacked ${defenderOwner}'s territory of ${defender} from ${attacker}.
// Dice: ${attackerOwner} rolled [${atkRolls.join(", ")}], defender rolled [${defRolls.join(", ")}].
// Losses: attacker lost ${atkLosses}, defender lost ${defLosses}.
// Be vivid and dramatic. One sentence only. No preamble.`;

//     const response = await ai.models.generateContent({ 
//       model: "gemini-3.8-flash", // <-- Updated model name
//       contents: prompt 
//     });
    
//     return NextResponse.json({ commentary: response.text?.trim() || "The battle rages on." });
//   } catch (error) {
//     console.error("AI Error:", error);
//     return NextResponse.json({ commentary: "The battle rages on with heavy casualties." });
//   }
// }