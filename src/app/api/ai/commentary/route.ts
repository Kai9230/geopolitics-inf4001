



// ... rest of your code


// import { NextResponse } from "next/server";
// import { GoogleGenAI } from "@google/genai";

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// // Dramatic fallbacks in case Google's servers are busy
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


import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: Request) {
  try {
    const { attacker, defender, atkRolls, defRolls, atkLosses, defLosses, attackerOwner, defenderOwner } = await req.json();
    const prompt = `You are a dramatic war correspondent in a strategy game.
Write a short, ONE-sentence cinematic commentary (under 25 words) about this battle:
${attackerOwner} attacked ${defenderOwner}'s territory of ${defender} from ${attacker}.
Dice: ${attackerOwner} rolled [${atkRolls.join(", ")}], defender rolled [${defRolls.join(", ")}].
Losses: attacker lost ${atkLosses}, defender lost ${defLosses}.
Be vivid and dramatic. One sentence only. No preamble.`;

    const response = await ai.models.generateContent({ 
      model: "gemini-3.8-flash", // <-- Updated model name
      contents: prompt 
    });
    
    return NextResponse.json({ commentary: response.text?.trim() || "The battle rages on." });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ commentary: "The battle rages on with heavy casualties." });
  }
}