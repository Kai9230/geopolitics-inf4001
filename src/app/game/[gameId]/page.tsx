
// "use client";

// import { useEffect, useState, useRef } from "react";
// import { useParams, useRouter } from "next/navigation";

// import {
//   doc,
//   onSnapshot,
//   updateDoc,
//   collection,
// } from "firebase/firestore";

// import { db, auth } from "../../../lib/firebase/config";
// import { GameEngine } from "../../../lib/engine/GameEngine";

// import { RiskMap } from "../../../components/game/RiskMap";
// import { BattleScene } from "../../../components/game/BattleScene";
// import { DiceOverlay } from "../../../components/game/DiceOverlay";

// import { SoundEngine } from "../../../lib/audio/SoundEngine";
// import { MusicPlayer } from "../../../lib/audio/MusicPlayer";

// import type { Country } from "../../../types";

// type Phase =
//   | "player-turn"
//   | "npc-turn"
//   | "game-over"
//   | "transfer";

// interface TransferData {
//   from: Country;
//   to: Country;
//   max: number;
//   reward: number;
// }

// interface CommentaryResponse {
//   commentary?: string;
//   source?: "groq" | "fallback";
//   model?: string | null;
//   reason?: string;
//   error?: string;
// }

// export default function GamePage() {
//   const { gameId } = useParams();
//   const router = useRouter();

//   const [countries, setCountries] = useState<Country[]>([]);
//   const [round, setRound] = useState(1);

//   const [selectedAtk, setSelectedAtk] = useState<string | null>(
//     null,
//   );

//   const [log, setLog] = useState<string[]>([
//     "⚔ Awaiting your command...",
//   ]);

//   const [loading, setLoading] = useState(true);

//   const [phase, setPhase] = useState<Phase>("player-turn");

//   const [fastForward, setFastForward] = useState(false);

//   const [attackedThisTurn, setAttackedThisTurn] =
//     useState(false);

//   const [battle, setBattle] = useState<{
//     attacker: Country;
//     defender: Country;
//   } | null>(null);

//   const [dice, setDice] = useState<{
//     atk: number[];
//     def: number[];
//     showing: boolean;
//   } | null>(null);

//   const [reinforced, setReinforced] = useState(false);

//   const [conquestAnimation, setConquestAnimation] =
//     useState<{
//       fromId: string;
//       toId: string;
//     } | null>(null);

//   const [transferData, setTransferData] =
//     useState<TransferData | null>(null);

//   const [transferAmount, setTransferAmount] = useState(1);

//   const playerId = auth.currentUser?.uid || "player";

//   const ffRef = useRef(false);

//   const gameOutcome =
//     countries.length === 0
//       ? null
//       : countries.every((country) => country.isPlayer)
//         ? "victory"
//         : countries.every((country) => !country.isPlayer)
//           ? "defeat"
//           : null;

//   // --------------------------------------------------
//   // Music
//   // --------------------------------------------------

//   useEffect(() => {
//     MusicPlayer.play(
//       "/sounds/ambient-theme.mp3",
//       true,
//       0.25,
//     );

//     return () => {
//       MusicPlayer.stop();
//     };
//   }, []);

//   // --------------------------------------------------
//   // Fast-forward setting
//   // --------------------------------------------------

//   useEffect(() => {
//     ffRef.current = fastForward;
//   }, [fastForward]);

//   // --------------------------------------------------
//   // Live Firebase listeners
//   // --------------------------------------------------

//   useEffect(() => {
//     if (!gameId) return;

//     const unsubscribeGame = onSnapshot(
//       doc(db, "games", gameId as string),
//       (snapshot) => {
//         if (snapshot.exists()) {
//           setRound(snapshot.data().turnNumber || 1);
//         }
//       },
//     );

//     const unsubscribeCountries = onSnapshot(
//       collection(
//         db,
//         "games",
//         gameId as string,
//         "countries",
//       ),
//       (snapshot) => {
//         setCountries(
//           snapshot.docs.map(
//             (countryDoc) => countryDoc.data() as Country,
//           ),
//         );

//         setLoading(false);
//       },
//     );

//     return () => {
//       unsubscribeGame();
//       unsubscribeCountries();
//     };
//   }, [gameId]);

//   // --------------------------------------------------
//   // Helpers
//   // --------------------------------------------------

//   const addLog = (message: string) => {
//     setLog((previous) => [
//       message,
//       ...previous,
//     ].slice(0, 20));
//   };

//   const sleep = (milliseconds: number) => {
//     return new Promise<void>((resolve) => {
//       setTimeout(
//         resolve,
//         ffRef.current
//           ? milliseconds / 5
//           : milliseconds,
//       );
//     });
//   };

//   // --------------------------------------------------
//   // Player reinforcements
//   // --------------------------------------------------

//   useEffect(() => {
//     if (
//       loading ||
//       phase !== "player-turn" ||
//       reinforced ||
//       round < 2
//     ) {
//       return;
//     }

//     const ownedCountries = countries.filter(
//       (country) => country.isPlayer,
//     );

//     if (ownedCountries.length === 0) return;

//     const total =
//       GameEngine.calculateReinforcements(
//         ownedCountries.length,
//       );

//     const perCountry = Math.floor(
//       total / ownedCountries.length,
//     );

//     let remainder =
//       total - perCountry * ownedCountries.length;

//     (async () => {
//       for (const country of ownedCountries) {
//         const additionalSoldiers =
//           perCountry + (remainder > 0 ? 1 : 0);

//         if (remainder > 0) {
//           remainder--;
//         }

//         await updateDoc(
//           doc(
//             db,
//             "games",
//             gameId as string,
//             "countries",
//             country.id,
//           ),
//           {
//             soldiers:
//               country.soldiers + additionalSoldiers,
//           },
//         );
//       }

//       addLog(
//         `🎺 Reinforcements: +${total} soldiers distributed ` +
//           `across ${ownedCountries.length} countries`,
//       );

//       SoundEngine.reinforce();
//       setReinforced(true);
//     })();
//   }, [
//     loading,
//     phase,
//     round,
//     countries,
//     reinforced,
//     gameId,
//   ]);

//   // --------------------------------------------------
//   // Victory audio
//   // --------------------------------------------------

//   useEffect(() => {
//     if (gameOutcome === "victory") {
//       SoundEngine.victory();

//       MusicPlayer.play(
//         "/sounds/victory.mp3",
//         false,
//         0.6,
//       );
//     }
//   }, [gameOutcome]);

//   // --------------------------------------------------
//   // Country selection
//   // --------------------------------------------------

//   const handleCountryClick = async (id: string) => {
//     if (
//       phase !== "player-turn" ||
//       attackedThisTurn
//     ) {
//       return;
//     }

//     const country = countries.find(
//       (item) => item.id === id,
//     );

//     if (!country) return;

//     SoundEngine.click();

//     if (!selectedAtk) {
//       if (!country.isPlayer) {
//         addLog("Select your own country first.");
//         return;
//       }

//       if (country.soldiers < 2) {
//         addLog(
//           "Need at least 2 soldiers to attack.",
//         );

//         return;
//       }

//       setSelectedAtk(id);

//       addLog(
//         `📍 Selected ${country.name} ` +
//           `(${country.soldiers} soldiers). Choose target.`,
//       );

//       return;
//     }

//     const attacker = countries.find(
//       (item) => item.id === selectedAtk,
//     );

//     if (!attacker) {
//       setSelectedAtk(null);
//       return;
//     }

//     if (country.isPlayer) {
//       setSelectedAtk(id);
//       return;
//     }

//     if (attacker.id === country.id) return;

//     setSelectedAtk(null);
//     setAttackedThisTurn(true);

//     await executeAttack(attacker, country);
//   };

//   // --------------------------------------------------
//   // Player attack
//   // --------------------------------------------------

//   const executeAttack = async (
//     attacker: Country,
//     defender: Country,
//   ) => {
//     addLog(
//       `⚔ ${attacker.name} attacks ${defender.name}!`,
//     );

//     MusicPlayer.play(
//       "/sounds/battle-theme.mp3",
//       true,
//       0.5,
//     );

//     setBattle({
//       attacker,
//       defender,
//     });

//     SoundEngine.clash();

//     await sleep(2500);

//     setBattle(null);

//     const result = GameEngine.resolveRound(
//       attacker.soldiers,
//       defender.soldiers,
//     );

//     SoundEngine.diceRoll();

//     setDice({
//       atk: result.atkRolls,
//       def: result.defRolls,
//       showing: true,
//     });

//     await sleep(2000);

//     SoundEngine.clash();

//     if (
//       result.atkLosses + result.defLosses > 0
//     ) {
//       setTimeout(() => {
//         SoundEngine.death();
//       }, 150);
//     }

//     const newAtk =
//       attacker.soldiers - result.atkLosses;

//     const newDef =
//       defender.soldiers - result.defLosses;

//     addLog(
//       `🎲 [${result.atkRolls.join(", ")}] vs ` +
//         `[${result.defRolls.join(", ")}] → ` +
//         `You −${result.atkLosses}, ` +
//         `Enemy −${result.defLosses}`,
//     );

//     // ----------------------------------------------
//     // Groq commentary
//     // ----------------------------------------------

//     try {
//       const response = await fetch(
//         "/api/ai/commentary",
//         {
//           method: "POST",

//           headers: {
//             "Content-Type": "application/json",
//           },

//           body: JSON.stringify({
//             attacker: attacker.name,
//             defender: defender.name,

//             atkRolls: result.atkRolls,
//             defRolls: result.defRolls,

//             atkLosses: result.atkLosses,
//             defLosses: result.defLosses,

//             attackerOwner: "Your forces",
//             defenderOwner: "The enemy",
//           }),
//         },
//       );

//       const data: CommentaryResponse =
//         await response.json();

//       if (
//         typeof data.commentary !== "string" ||
//         !data.commentary.trim()
//       ) {
//         throw new Error(
//           data.error ||
//             "No commentary was returned",
//         );
//       }

//       if (
//         response.ok &&
//         data.source === "groq"
//       ) {
//         addLog(
//           `🎙 AI: ${data.commentary.trim()}`,
//         );
//       } else {
//         addLog(
//           `📡 Battle report: ${data.commentary.trim()}`,
//         );

//         console.warn(
//           "Live AI commentary unavailable:",
//           {
//             status: response.status,
//             reason: data.reason,
//           },
//         );
//       }
//     } catch (error: unknown) {
//       console.error(
//         "Could not load battle commentary:",
//         error instanceof Error
//           ? error.message
//           : error,
//       );

//       addLog(
//         `📡 ${attacker.name} lost ` +
//           `${result.atkLosses} soldiers; ` +
//           `${defender.name} lost ` +
//           `${result.defLosses}.`,
//       );
//     }

//     setDice(null);

//     // ----------------------------------------------
//     // Conquest or ordinary battle result
//     // ----------------------------------------------

//     if (result.conquered) {
//       const reward =
//         GameEngine.calculateConquestReward(
//           defender.soldiers,
//         );

//       const maxTransfer = newAtk - 1;

//       await updateDoc(
//         doc(
//           db,
//           "games",
//           gameId as string,
//           "countries",
//           defender.id,
//         ),
//         {
//           soldiers: reward,
//           isPlayer: true,
//           ownerId: playerId,
//         },
//       );

//       await updateDoc(
//         doc(
//           db,
//           "games",
//           gameId as string,
//           "countries",
//           attacker.id,
//         ),
//         {
//           soldiers: maxTransfer,
//         },
//       );

//       addLog(
//         `★ CONQUERED ${defender.name}! ` +
//           `Base reward: +${reward}. ` +
//           "Transfer troops now.",
//       );

//       SoundEngine.victory();

//       setConquestAnimation({
//         fromId: attacker.id,
//         toId: defender.id,
//       });

//       setTimeout(() => {
//         setConquestAnimation(null);
//       }, 2000);

//       setTransferData({
//         from: attacker,

//         to: {
//           ...defender,
//           soldiers: reward,
//         },

//         max: maxTransfer,
//         reward,
//       });

//       setTransferAmount(1);
//       setPhase("transfer");
//     } else {
//       await updateDoc(
//         doc(
//           db,
//           "games",
//           gameId as string,
//           "countries",
//           defender.id,
//         ),
//         {
//           soldiers: newDef,
//         },
//       );

//       await updateDoc(
//         doc(
//           db,
//           "games",
//           gameId as string,
//           "countries",
//           attacker.id,
//         ),
//         {
//           soldiers: newAtk,
//         },
//       );

//       await finishTurn();
//     }

//     MusicPlayer.play(
//       "/sounds/ambient-theme.mp3",
//       true,
//       0.25,
//     );
//   };

//   // --------------------------------------------------
//   // Conquest transfer
//   // --------------------------------------------------

//   const confirmTransfer = async () => {
//     if (!transferData) return;

//     const {
//       from,
//       to,
//       reward,
//     } = transferData;

//     await updateDoc(
//       doc(
//         db,
//         "games",
//         gameId as string,
//         "countries",
//         from.id,
//       ),
//       {
//         soldiers:
//           from.soldiers - transferData.max,
//       },
//     );

//     await updateDoc(
//       doc(
//         db,
//         "games",
//         gameId as string,
//         "countries",
//         to.id,
//       ),
//       {
//         soldiers:
//           reward + transferAmount,
//       },
//     );

//     addLog(
//       `🛡 Transferred ${transferAmount} ` +
//         `soldiers to ${to.name}.`,
//     );

//     setTransferData(null);

//     await finishTurn();
//   };

//   // --------------------------------------------------
//   // End player turn
//   // --------------------------------------------------

//   const finishTurn = async () => {
//     await runNpcTurns();

//     setAttackedThisTurn(false);
//   };

//   // --------------------------------------------------
//   // NPC turns
//   // --------------------------------------------------

//   const runNpcTurns = async () => {
//     setPhase("npc-turn");

//     addLog("🤖 NPC nations are moving...");

//     const snapshot =
//       await new Promise<Country[]>((resolve) => {
//         const unsubscribe = onSnapshot(
//           collection(
//             db,
//             "games",
//             gameId as string,
//             "countries",
//           ),
//           (result) => {
//             resolve(
//               result.docs.map(
//                 (countryDoc) =>
//                   countryDoc.data() as Country,
//               ),
//             );

//             unsubscribe();
//           },
//         );
//       });

//     const npcGroups =
//       new Map<string, Country[]>();

//     snapshot.forEach((country) => {
//       if (!country.isPlayer) {
//         if (
//           !npcGroups.has(country.ownerId)
//         ) {
//           npcGroups.set(
//             country.ownerId,
//             [],
//           );
//         }

//         npcGroups
//           .get(country.ownerId)!
//           .push(country);
//       }
//     });

//     for (const npcId of npcGroups.keys()) {
//       const current =
//         await new Promise<Country[]>((resolve) => {
//           const unsubscribe = onSnapshot(
//             collection(
//               db,
//               "games",
//               gameId as string,
//               "countries",
//             ),
//             (result) => {
//               resolve(
//                 result.docs.map(
//                   (countryDoc) =>
//                     countryDoc.data() as Country,
//                 ),
//               );

//               unsubscribe();
//             },
//           );
//         });

//       const npcAlive = current.filter(
//         (country) =>
//           country.ownerId === npcId,
//       );

//       if (npcAlive.length === 0) {
//         continue;
//       }

//       const pick =
//         GameEngine.pickNpcTarget(
//           npcAlive,
//           current,
//         );

//       if (!pick) {
//         await sleep(400);
//         continue;
//       }

//       const result =
//         GameEngine.resolveRound(
//           pick.attacker.soldiers,
//           pick.defender.soldiers,
//         );

//       addLog(
//         `🤖 ${pick.attacker.name} attacks ` +
//           `${pick.defender.name}: ` +
//           `[${result.atkRolls.join(",")}] vs ` +
//           `[${result.defRolls.join(",")}]`,
//       );

//       const newA =
//         pick.attacker.soldiers -
//         result.atkLosses;

//       const newD =
//         pick.defender.soldiers -
//         result.defLosses;

//       if (result.conquered) {
//         const reward =
//           GameEngine.calculateConquestReward(
//             pick.defender.soldiers,
//           );

//         await updateDoc(
//           doc(
//             db,
//             "games",
//             gameId as string,
//             "countries",
//             pick.defender.id,
//           ),
//           {
//             soldiers:
//               reward +
//               Math.max(1, newA - 1),

//             isPlayer: false,
//             ownerId: npcId,
//           },
//         );

//         await updateDoc(
//           doc(
//             db,
//             "games",
//             gameId as string,
//             "countries",
//             pick.attacker.id,
//           ),
//           {
//             soldiers: 1,
//           },
//         );

//         addLog(
//           `💀 ${pick.defender.name} has fallen ` +
//             `to ${pick.attacker.name}!`,
//         );
//       } else {
//         await updateDoc(
//           doc(
//             db,
//             "games",
//             gameId as string,
//             "countries",
//             pick.attacker.id,
//           ),
//           {
//             soldiers: newA,
//           },
//         );

//         await updateDoc(
//           doc(
//             db,
//             "games",
//             gameId as string,
//             "countries",
//             pick.defender.id,
//           ),
//           {
//             soldiers: newD,
//           },
//         );
//       }

//       await sleep(600);
//     }

//     const nextRound = round + 1;

//     await updateDoc(
//       doc(
//         db,
//         "games",
//         gameId as string,
//       ),
//       {
//         turnNumber: nextRound,
//       },
//     );

//     setRound(nextRound);
//     setReinforced(false);
//     setPhase("player-turn");

//     addLog(
//       `━━━ Round ${nextRound} · Your turn ━━━`,
//     );
//   };

//   // --------------------------------------------------
//   // Skip player turn
//   // --------------------------------------------------

//   const handleSkip = async () => {
//     if (phase !== "player-turn") return;

//     SoundEngine.click();

//     setSelectedAtk(null);

//     addLog("⏭ You skip your attack.");

//     await finishTurn();
//   };

//   // --------------------------------------------------
//   // Loading screen
//   // --------------------------------------------------

//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center bg-[#03050a] text-[#f4c430] text-2xl font-black tracking-widest animate-pulse">
//         LOADING WORLD...
//       </div>
//     );
//   }

//   // --------------------------------------------------
//   // Victory / defeat screen
//   // --------------------------------------------------

//   if (
//     phase === "game-over" ||
//     gameOutcome
//   ) {
//     const won =
//       gameOutcome === "victory";

//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center bg-[#03050a] p-8">
//         <h1
//           className={`text-6xl font-black tracking-widest uppercase mb-8 ${
//             won
//               ? "text-[#f4c430]"
//               : "text-red-500"
//           }`}
//         >
//           {won
//             ? "★ VICTORY ★"
//             : "💀 DEFEAT 💀"}
//         </h1>

//         <button
//           onClick={() =>
//             router.push("/lobby")
//           }
//           className="px-8 py-4 bg-[#f4c430] text-black font-black rounded-lg hover:bg-yellow-500 uppercase tracking-widest"
//         >
//           Return to War Room
//         </button>
//       </div>
//     );
//   }

//   // --------------------------------------------------
//   // Game interface
//   // --------------------------------------------------

//   return (
//     <div className="min-h-screen bg-[#03050a] p-4 md:p-8">
//       {battle && (
//         <BattleScene
//           attackerName={
//             battle.attacker.name
//           }
//           defenderName={
//             battle.defender.name
//           }
//           attackerFlag={
//             battle.attacker.flag
//           }
//           defenderFlag={
//             battle.defender.flag
//           }
//           attackerSoldiers={
//             battle.attacker.soldiers
//           }
//           defenderSoldiers={
//             battle.defender.soldiers
//           }
//           onComplete={() => {}}
//         />
//       )}

//       {dice && (
//         <DiceOverlay
//           attackerRolls={dice.atk}
//           defenderRolls={dice.def}
//           showing={dice.showing}
//         />
//       )}

//       {phase === "transfer" &&
//         transferData && (
//           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
//             <div className="bg-[#0a1424] border-2 border-[#f4c430] p-8 rounded-2xl max-w-md w-full shadow-2xl">
//               <h2 className="text-2xl text-[#f4c430] font-black uppercase tracking-widest mb-2 text-center">
//                 Conquered!
//               </h2>

//               <p className="text-gray-300 text-center mb-6 text-sm">
//                 Choose how many soldiers
//                 to transfer from{" "}
//                 {transferData.from.name}
//                 {" "}to{" "}
//                 {transferData.to.name}.
//               </p>

//               <div className="flex items-center justify-center gap-6 mb-8">
//                 <button
//                   onClick={() =>
//                     setTransferAmount(
//                       Math.max(
//                         1,
//                         transferAmount - 1,
//                       ),
//                     )
//                   }
//                   className="w-12 h-12 bg-black/50 border border-[#f4c430]/30 rounded-full text-[#f4c430] text-2xl font-bold hover:bg-[#f4c430]/20 transition"
//                 >
//                   −
//                 </button>

//                 <div className="text-5xl font-black text-white">
//                   {transferAmount}
//                 </div>

//                 <button
//                   onClick={() =>
//                     setTransferAmount(
//                       Math.min(
//                         transferData.max,
//                         transferAmount + 1,
//                       ),
//                     )
//                   }
//                   className="w-12 h-12 bg-black/50 border border-[#f4c430]/30 rounded-full text-[#f4c430] text-2xl font-bold hover:bg-[#f4c430]/20 transition"
//                 >
//                   +
//                 </button>
//               </div>

//               <button
//                 onClick={confirmTransfer}
//                 className="w-full bg-[#f4c430] text-black font-black py-4 rounded-xl hover:bg-yellow-500 transition tracking-widest uppercase"
//               >
//                 Confirm Transfer
//               </button>
//             </div>
//           </div>
//         )}

//       <div className="max-w-7xl mx-auto">
//         <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
//           <div>
//             <h1 className="text-3xl text-[#f4c430] tracking-widest font-black uppercase">
//               Round {round}
//             </h1>

//             <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
//               {phase === "player-turn"
//                 ? attackedThisTurn
//                   ? "NPC TURNS..."
//                   : "YOUR TURN"
//                 : phase.toUpperCase()}
//             </p>
//           </div>

//           <div className="flex gap-2 items-center">
//             <button
//               onClick={() =>
//                 setFastForward(
//                   !fastForward,
//                 )
//               }
//               className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border ${
//                 fastForward
//                   ? "bg-[#f4c430] text-black border-[#f4c430]"
//                   : "border-[#f4c430]/30 text-[#f4c430] hover:bg-[#f4c430]/10"
//               }`}
//             >
//               {fastForward
//                 ? "⏩ Fast ON"
//                 : "⏩ Fast"}
//             </button>

//             <button
//               onClick={handleSkip}
//               disabled={
//                 phase !== "player-turn" ||
//                 attackedThisTurn
//               }
//               className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-[#f4c430]/30 text-[#f4c430] hover:bg-[#f4c430]/10 disabled:opacity-30"
//             >
//               ⏭ Skip Turn
//             </button>

//             <button
//               onClick={() =>
//                 router.push("/lobby")
//               }
//               className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-black/50 border border-white/10 text-gray-400 hover:text-white"
//             >
//               Exit
//             </button>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//           <div className="lg:col-span-2">
//             <RiskMap
//               countries={countries}
//               onCountryClick={
//                 handleCountryClick
//               }
//               selectedAtk={selectedAtk}
//               conquestAnimation={
//                 conquestAnimation
//               }
//             />
//           </div>

//           <div className="bg-[#0a1424]/80 backdrop-blur-md rounded-xl border border-[#f4c430]/20 p-4 flex flex-col h-[65vh]">
//             <h2 className="text-[#f4c430] text-sm font-black uppercase tracking-widest border-b border-[#f4c430]/20 pb-2 mb-3">
//               📡 War Correspondent
//             </h2>

//             <div
//               className="flex-1 overflow-y-auto space-y-2 text-xs font-mono"
//               aria-live="polite"
//             >
//               {log.map(
//                 (message, index) => (
//                   <div
//                     key={index}
//                     className="p-2 bg-black/40 rounded border-l-2 border-[#f4c430]/40 text-gray-300"
//                   >
//                     {message}
//                   </div>
//                 ),
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );





"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc, collection } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase/config";
import { GameEngine } from "../../../lib/engine/GameEngine";
import { RiskMap } from "../../../components/game/RiskMap";
import { BattleScene } from "../../../components/game/BattleScene";
import { DiceOverlay } from "../../../components/game/DiceOverlay";
import { SoundEngine } from "../../../lib/audio/SoundEngine";
import { MusicPlayer } from "../../../lib/audio/MusicPlayer";
import { Country } from "../../../types";

type Phase = "player-turn" | "npc-turn" | "game-over" | "transfer";

export default function GamePage() {
  const { gameId } = useParams();
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [round, setRound] = useState(1);
  const [selectedAtk, setSelectedAtk] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>(["⚔ Awaiting your command..."]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("player-turn");
  const [fastForward, setFastForward] = useState(false);
  const [attackedThisTurn, setAttackedThisTurn] = useState(false);
  
  const [battle, setBattle] = useState<{ attacker: Country; defender: Country } | null>(null);
  const [dice, setDice] = useState<{ atk: number[]; def: number[]; showing: boolean } | null>(null);
  const [reinforced, setReinforced] = useState(false);
  const [conquestAnimation, setConquestAnimation] = useState<{ fromId: string; toId: string } | null>(null);

  // Transfer State
  const [transferData, setTransferData] = useState<{
    from: Country; to: Country; max: number; reward: number;
  } | null>(null);
  const [transferAmount, setTransferAmount] = useState(1);

  const playerId = auth.currentUser?.uid || "player";
  const ffRef = useRef(false);
  
  const gameOutcome = countries.length === 0 ? null : countries.every((c) => c.isPlayer) ? "victory" : countries.every((c) => !c.isPlayer) ? "defeat" : null;

  // --- 1. AMBIENT MUSIC ON GAME LOAD ---
  useEffect(() => {
    MusicPlayer.play("/sounds/ambient-theme.mp3", true, 0.25);
    return () => MusicPlayer.stop();
  }, []);

  useEffect(() => { ffRef.current = fastForward; }, [fastForward]);

  useEffect(() => {
    if (!gameId) return;
    const unsubGame = onSnapshot(doc(db, "games", gameId as string), (snap) => {
      if (snap.exists()) setRound(snap.data().turnNumber || 1);
    });
    const unsubC = onSnapshot(collection(db, "games", gameId as string, "countries"), (snap) => {
      setCountries(snap.docs.map((d) => d.data() as Country));
      setLoading(false);
    });
    return () => { unsubGame(); unsubC(); };
  }, [gameId]);

  const addLog = (msg: string) => setLog((prev) => [msg, ...prev].slice(0, 20));
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ffRef.current ? ms / 5 : ms));

  useEffect(() => {
    if (loading || phase !== "player-turn" || reinforced || round < 2) return;
    const mine = countries.filter((c) => c.isPlayer);
    if (mine.length === 0) return;
    const total = GameEngine.calculateReinforcements(mine.length);
    const per = Math.floor(total / mine.length);
    let remainder = total - per * mine.length;

    (async () => {
      for (const c of mine) {
        const add = per + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        await updateDoc(doc(db, "games", gameId as string, "countries", c.id), { soldiers: c.soldiers + add });
      }
      addLog(`🎺 Reinforcements: +${total} soldiers distributed across ${mine.length} countries`);
      SoundEngine.reinforce();
      setReinforced(true);
    })();
  }, [loading, phase, round, countries, reinforced, gameId]);

  useEffect(() => {
    if (gameOutcome === "victory") {
      SoundEngine.victory();
      MusicPlayer.play("/sounds/victory.mp3", false, 0.6);
    }
  }, [gameOutcome]);

  const handleCountryClick = async (id: string) => {
    if (phase !== "player-turn" || attackedThisTurn) return;
    const c = countries.find((x) => x.id === id);
    if (!c) return;
    SoundEngine.click();

    if (!selectedAtk) {
      if (!c.isPlayer) return addLog("Select your own country first.");
      if (c.soldiers < 2) return addLog("Need at least 2 soldiers to attack.");
      setSelectedAtk(id);
      addLog(`📍 Selected ${c.name} (${c.soldiers} soldiers). Choose target.`);
    } else {
      const attacker = countries.find((x) => x.id === selectedAtk)!;
      if (c.isPlayer) return setSelectedAtk(id);
      if (attacker.id === c.id) return;
      setSelectedAtk(null);
      setAttackedThisTurn(true);
      await executeAttack(attacker, c);
    }
  };

  const executeAttack = async (attacker: Country, defender: Country) => {
    addLog(`⚔ ${attacker.name} attacks ${defender.name}!`);
    
    // --- 2. SWITCH TO BATTLE MUSIC ---
    MusicPlayer.play("/sounds/battle-theme.mp3", true, 0.5);

    setBattle({ attacker, defender });
    SoundEngine.clash();
    await sleep(2500);
    setBattle(null);

    const result = GameEngine.resolveRound(attacker.soldiers, defender.soldiers);
    SoundEngine.diceRoll();
    setDice({ atk: result.atkRolls, def: result.defRolls, showing: true });
    await sleep(2000);

    SoundEngine.clash();
    if (result.atkLosses + result.defLosses > 0) setTimeout(() => SoundEngine.death(), 150);

    const newAtk = attacker.soldiers - result.atkLosses;
    const newDef = defender.soldiers - result.defLosses;

    addLog(`🎲 [${result.atkRolls.join(", ")}] vs [${result.defRolls.join(", ")}] → You −${result.atkLosses}, Enemy −${result.defLosses}`);


try {
  const res = await fetch("/api/ai/commentary", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      attacker: attacker.name,
      defender: defender.name,

      atkRolls: result.atkRolls,
      defRolls: result.defRolls,

      atkLosses: result.atkLosses,
      defLosses: result.defLosses,

      attackerOwner: "Your forces",
      defenderOwner: "The enemy",
    }),
  });

  const data = await res.json();

  if (
    typeof data.commentary !== "string" ||
    !data.commentary.trim()
  ) {
    throw new Error(
      data.error || "No commentary was returned",
    );
  }

  if (res.ok && data.source === "groq") {
    addLog(`🎙 AI: ${data.commentary}`);
  } else {
    addLog(`📡 Battle report: ${data.commentary}`);

    console.warn("Live AI commentary unavailable:", {
      status: res.status,
      reason: data.reason,
    });
  }
} catch (error: unknown) {
  console.error(
    "Could not load battle commentary:",
    error instanceof Error ? error.message : error,
  );

  addLog(
    `📡 ${attacker.name} lost ${result.atkLosses} soldiers; ` +
    `${defender.name} lost ${result.defLosses}.`,
  );
}


    // try {
    //   const res = await fetch("/api/ai/commentary", {
    //     method: "POST", headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       attacker: attacker.name, defender: defender.name,
    //       atkRolls: result.atkRolls, defRolls: result.defRolls,
    //       atkLosses: result.atkLosses, defLosses: result.defLosses,
    //       attackerOwner: "Your forces", defenderOwner: "The enemy",
    //     }),
    //   });
    //   const data = await res.json();
    //   addLog(`🎙 ${data.commentary}`);
    // } catch { addLog("🎙 The battle rages."); }

    setDice(null);

    if (result.conquered) {
      const reward = GameEngine.calculateConquestReward(defender.soldiers);
      const maxTransfer = newAtk - 1;
      
      const defRef = doc(db, "games", gameId as string, "countries", defender.id);
      await updateDoc(defRef, {
        soldiers: reward,
        isPlayer: true,
        ownerId: playerId,
      });
      await updateDoc(doc(db, "games", gameId as string, "countries", attacker.id), { soldiers: maxTransfer });
      
      addLog(`★ CONQUERED ${defender.name}! Base reward: +${reward}. Transfer troops now.`);
      SoundEngine.victory();

      // Trigger the invading dots animation
      setConquestAnimation({ fromId: attacker.id, toId: defender.id });
      setTimeout(() => setConquestAnimation(null), 2000);
      
      setTransferData({ from: attacker, to: { ...defender, soldiers: reward }, max: maxTransfer, reward });
      setTransferAmount(1);
      setPhase("transfer");
      
    } else {
      await updateDoc(doc(db, "games", gameId as string, "countries", defender.id), { soldiers: newDef });
      await updateDoc(doc(db, "games", gameId as string, "countries", attacker.id), { soldiers: newAtk });
      await finishTurn();
    }
    
    // --- 3. SWITCH BACK TO AMBIENT MUSIC WHEN BATTLE IS OVER ---
    MusicPlayer.play("/sounds/ambient-theme.mp3", true, 0.25);
  };

  const confirmTransfer = async () => {
    if (!transferData) return;
    const { from, to, reward } = transferData;
    
    await updateDoc(doc(db, "games", gameId as string, "countries", from.id), { soldiers: from.soldiers - transferData.max });
    await updateDoc(doc(db, "games", gameId as string, "countries", to.id), { soldiers: reward + transferAmount });

    addLog(`🛡 Transferred ${transferAmount} soldiers to ${to.name}.`);
    setTransferData(null);
    await finishTurn();
  };

  const finishTurn = async () => {
    await runNpcTurns();
    setAttackedThisTurn(false);
  };

  const runNpcTurns = async () => {
    setPhase("npc-turn");
    addLog("🤖 NPC nations are moving...");

    const snap = await new Promise<Country[]>((resolve) => {
      const unsub = onSnapshot(collection(db, "games", gameId as string, "countries"), (s) => {
        resolve(s.docs.map((d) => d.data() as Country));
        unsub();
      });
    });

    const npcGroups = new Map<string, Country[]>();
    snap.forEach((c) => {
      if (!c.isPlayer) {
        if (!npcGroups.has(c.ownerId)) npcGroups.set(c.ownerId, []);
        npcGroups.get(c.ownerId)!.push(c);
      }
    });

    for (const npcId of npcGroups.keys()) {
      const current = await new Promise<Country[]>((resolve) => {
        const unsub = onSnapshot(collection(db, "games", gameId as string, "countries"), (s) => {
          resolve(s.docs.map((d) => d.data() as Country));
          unsub();
        });
      });

      const npcAlive = current.filter((c) => c.ownerId === npcId);
      if (npcAlive.length === 0) continue;

      const pick = GameEngine.pickNpcTarget(npcAlive, current);
      if (!pick) { await sleep(400); continue; }

      const res = GameEngine.resolveRound(pick.attacker.soldiers, pick.defender.soldiers);
      addLog(`🤖 ${pick.attacker.name} attacks ${pick.defender.name}: [${res.atkRolls.join(",")}] vs [${res.defRolls.join(",")}]`);

      const newA = pick.attacker.soldiers - res.atkLosses;
      const newD = pick.defender.soldiers - res.defLosses;

      if (res.conquered) {
        const reward = GameEngine.calculateConquestReward(pick.defender.soldiers);
        await updateDoc(doc(db, "games", gameId as string, "countries", pick.defender.id), {
          soldiers: reward + Math.max(1, newA - 1), isPlayer: false, ownerId: npcId,
        });
        await updateDoc(doc(db, "games", gameId as string, "countries", pick.attacker.id), { soldiers: 1 });
        addLog(`💀 ${pick.defender.name} has fallen to ${pick.attacker.name}!`);
      } else {
        await updateDoc(doc(db, "games", gameId as string, "countries", pick.attacker.id), { soldiers: newA });
        await updateDoc(doc(db, "games", gameId as string, "countries", pick.defender.id), { soldiers: newD });
      }
      await sleep(600);
    }

    const nextRound = round + 1;
    await updateDoc(doc(db, "games", gameId as string), { turnNumber: nextRound });
    setRound(nextRound);
    setReinforced(false);
    setPhase("player-turn");
    addLog(`━━━ Round ${nextRound} · Your turn ━━━`);
  };

  const handleSkip = async () => {
    if (phase !== "player-turn") return;
    SoundEngine.click();
    setSelectedAtk(null);
    addLog("⏭ You skip your attack.");
    await finishTurn();
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#03050a] text-[#f4c430] text-2xl font-black tracking-widest animate-pulse">LOADING WORLD...</div>;

  if (phase === "game-over" || gameOutcome) {
    const won = gameOutcome === "victory";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#03050a] p-8">
        <h1 className={`text-6xl font-black tracking-widest uppercase mb-8 ${won ? "text-[#f4c430]" : "text-red-500"}`}>{won ? "★ VICTORY ★" : "💀 DEFEAT 💀"}</h1>
        <button onClick={() => router.push("/lobby")} className="px-8 py-4 bg-[#f4c430] text-black font-black rounded-lg hover:bg-yellow-500 uppercase tracking-widest">Return to War Room</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#03050a] p-4 md:p-8">
      {/* 2D Soldier Fighting Animation */}
      {battle && <BattleScene {...{ ...battle, attackerName: battle.attacker.name, defenderName: battle.defender.name, attackerFlag: battle.attacker.flag, defenderFlag: battle.defender.flag, attackerSoldiers: battle.attacker.soldiers, defenderSoldiers: battle.defender.soldiers, onComplete: () => {} }} />}
      
      {/* 3D Dice Roll Animation */}
      {dice && <DiceOverlay attackerRolls={dice.atk} defenderRolls={dice.def} showing={dice.showing} />}

      {/* Transfer Modal */}
      {phase === "transfer" && transferData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a1424] border-2 border-[#f4c430] p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <h2 className="text-2xl text-[#f4c430] font-black uppercase tracking-widest mb-2 text-center">Conquered!</h2>
            <p className="text-gray-300 text-center mb-6 text-sm">Choose how many soldiers to transfer from {transferData.from.name} to {transferData.to.name}.</p>
            <div className="flex items-center justify-center gap-6 mb-8">
              <button onClick={() => setTransferAmount(Math.max(1, transferAmount - 1))} className="w-12 h-12 bg-black/50 border border-[#f4c430]/30 rounded-full text-[#f4c430] text-2xl font-bold hover:bg-[#f4c430]/20 transition">−</button>
              <div className="text-5xl font-black text-white">{transferAmount}</div>
              <button onClick={() => setTransferAmount(Math.min(transferData.max, transferAmount + 1))} className="w-12 h-12 bg-black/50 border border-[#f4c430]/30 rounded-full text-[#f4c430] text-2xl font-bold hover:bg-[#f4c430]/20 transition">+</button>
            </div>
            <button onClick={confirmTransfer} className="w-full bg-[#f4c430] text-black font-black py-4 rounded-xl hover:bg-yellow-500 transition tracking-widest uppercase">Confirm Transfer</button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl text-[#f4c430] tracking-widest font-black uppercase">Round {round}</h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{phase === "player-turn" ? (attackedThisTurn ? "NPC TURNS..." : "YOUR TURN") : phase.toUpperCase()}</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setFastForward(!fastForward)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border ${fastForward ? "bg-[#f4c430] text-black border-[#f4c430]" : "border-[#f4c430]/30 text-[#f4c430] hover:bg-[#f4c430]/10"}`}>{fastForward ? "⏩ Fast ON" : "⏩ Fast"}</button>
            <button onClick={handleSkip} disabled={phase !== "player-turn" || attackedThisTurn} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-[#f4c430]/30 text-[#f4c430] hover:bg-[#f4c430]/10 disabled:opacity-30">⏭ Skip Turn</button>
            <button onClick={() => router.push("/lobby")} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-black/50 border border-white/10 text-gray-400 hover:text-white">Exit</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {/* Pass the conquest animation trigger to the map */}
            <RiskMap countries={countries} onCountryClick={handleCountryClick} selectedAtk={selectedAtk} conquestAnimation={conquestAnimation} />
          </div>
          <div className="bg-[#0a1424]/80 backdrop-blur-md rounded-xl border border-[#f4c430]/20 p-4 flex flex-col h-[65vh]">
            <h2 className="text-[#f4c430] text-sm font-black uppercase tracking-widest border-b border-[#f4c430]/20 pb-2 mb-3">📡 War Correspondent</h2>
            <div className="flex-1 overflow-y-auto space-y-2 text-xs font-mono">
              {log.map((m, i) => <div key={i} className="p-2 bg-black/40 rounded border-l-2 border-[#f4c430]/40 text-gray-300">{m}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// "use client";
// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { auth } from "../../../lib/firebase/config";
// import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
// import { ParticleBackground } from "../../../components/ParticleBackground";
// import { MusicPlayer } from "../../../lib/audio/MusicPlayer";

// export default function AuthPage() {
//   const [isLogin, setIsLogin] = useState(true);
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const router = useRouter();



  
//   // useEffect(() => {
//   //   const start = () => MusicPlayer.play("/sounds/login-theme.mp3", true, 0.3);
//   //   document.addEventListener("click", start, { once: true });
//   //   return () => {
//   //     document.removeEventListener("click", start);
//   //     MusicPlayer.stop(); // Stops login music when leaving page
//   //   };
//   // }, []);

//   const handleAuth = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
//     try {
//       if (isLogin) await signInWithEmailAndPassword(auth, email, password);
//       else await createUserWithEmailAndPassword(auth, email, password);
      
//       MusicPlayer.stop(); // STOP LOGIN MUSIC BEFORE REDIRECTING
//       router.push("/lobby");
//     } catch (err: unknown) {
//       setError(err instanceof Error ? err.message : "Unexpected error");
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
//       <div className="aurora-bg">
//         <div className="aurora-blob blob-gold"></div>
//         <div className="aurora-blob blob-blue"></div>
//         <div className="aurora-blob blob-red"></div>
//       </div>
//       <div className="earth-container">
//         <div className="earth-halo"></div>
//         <div className="earth-sphere"><div className="earth-continents"></div></div>
//       </div>
//       <ParticleBackground />
//       <div className="noise-overlay"></div>
//       <div className="vignette"></div>

//       <div className="glass-panel p-10 w-full max-w-md relative z-10 mx-4">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl tracking-[0.15em] font-black uppercase title-gold mb-3 whitespace-nowrap">Geopolitics</h1>
//           <p className="text-[#f4c430] text-xs font-bold tracking-[0.4em] uppercase opacity-70">Ten Nations · One Throne</p>
//         </div>
//         {error && <div className="bg-red-900/50 text-red-400 p-3 rounded mb-6 text-sm border border-red-500/50 text-center uppercase">{error}</div>}
//         <form onSubmit={handleAuth} className="space-y-5">
//           <div>
//             <label className="block text-[10px] font-bold mb-2 text-gray-400 uppercase tracking-[0.2em]">Email</label>
//             <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-[#f4c430]" required />
//           </div>
//           <div>
//             <label className="block text-[10px] font-bold mb-2 text-gray-400 uppercase tracking-[0.2em]">Password</label>
//             <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-[#f4c430]" required />
//           </div>
//           <button type="submit" className="w-full bg-linear-to-r from-[#f4c430] to-[#fbbf24] text-black font-black p-4 rounded-lg hover:shadow-[0_0_40px_rgba(244,196,48,0.6)] transition tracking-[0.2em] uppercase mt-4">
//             {isLogin ? "Sign In" : "Register"}
//           </button>
//         </form>
//         <div className="mt-8 pt-6 border-t border-white/10 text-center">
//           <p className="text-[10px] text-gray-500 cursor-pointer hover:text-[#f4c430] uppercase tracking-[0.2em] font-bold" onClick={() => setIsLogin(!isLogin)}>
//             {isLogin ? "No account? Register" : "Already registered? Sign In"}
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }


// // "use client";
// // import { useEffect, useState, useRef } from "react";
// // import { useParams, useRouter } from "next/navigation";
// // import { doc, onSnapshot, updateDoc, collection } from "firebase/firestore";
// // import { db, auth } from "../../../lib/firebase/config";
// // import { GameEngine } from "../../../lib/engine/GameEngine";
// // import { RiskMap } from "../../../components/game/RiskMap";
// // import { BattleScene } from "../../../components/game/BattleScene";
// // import { DiceOverlay } from "../../../components/game/DiceOverlay";
// // import { SoundEngine } from "../../../lib/audio/SoundEngine";
// // import { MusicPlayer } from "../../../lib/audio/MusicPlayer";
// // import { Country } from "../../../types";

// // type Phase = "player-turn" | "npc-turn" | "game-over" | "transfer";

// // export default function GamePage() {
// //   const { gameId } = useParams();
// //   const router = useRouter();
// //   const [countries, setCountries] = useState<Country[]>([]);
// //   const [round, setRound] = useState(1);
// //   const [selectedAtk, setSelectedAtk] = useState<string | null>(null);
// //   const [log, setLog] = useState<string[]>(["⚔ Awaiting your command..."]);
// //   const [loading, setLoading] = useState(true);
// //   const [phase, setPhase] = useState<Phase>("player-turn");
// //   const [fastForward, setFastForward] = useState(false);
// //   const [attackedThisTurn, setAttackedThisTurn] = useState(false);
  
// //   const [battle, setBattle] = useState<{ attacker: Country; defender: Country } | null>(null);
// //   const [dice, setDice] = useState<{ atk: number[]; def: number[]; showing: boolean } | null>(null);
// //   const [reinforced, setReinforced] = useState(false);
// //   const [conquestAnimation, setConquestAnimation] = useState<{ fromId: string; toId: string } | null>(null);

// //   // Transfer State
// //   const [transferData, setTransferData] = useState<{
// //     from: Country; to: Country; max: number; reward: number;
// //   } | null>(null);
// //   const [transferAmount, setTransferAmount] = useState(1);

// //   const playerId = auth.currentUser?.uid || "player";
// //   const ffRef = useRef(false);
  
// //   const gameOutcome = countries.length === 0 ? null : countries.every((c) => c.isPlayer) ? "victory" : countries.every((c) => !c.isPlayer) ? "defeat" : null;

// //   useEffect(() => { ffRef.current = fastForward; }, [fastForward]);

// //   useEffect(() => {
// //     if (!gameId) return;
// //     const unsubGame = onSnapshot(doc(db, "games", gameId as string), (snap) => {
// //       if (snap.exists()) setRound(snap.data().turnNumber || 1);
// //     });
// //     const unsubC = onSnapshot(collection(db, "games", gameId as string, "countries"), (snap) => {
// //       setCountries(snap.docs.map((d) => d.data() as Country));
// //       setLoading(false);
// //     });
// //     return () => { unsubGame(); unsubC(); };
// //   }, [gameId]);

// //   const addLog = (msg: string) => setLog((prev) => [msg, ...prev].slice(0, 20));
// //   const sleep = (ms: number) => new Promise((r) => setTimeout(r, ffRef.current ? ms / 5 : ms));

// //   useEffect(() => {
// //     if (loading || phase !== "player-turn" || reinforced || round < 2) return;
// //     const mine = countries.filter((c) => c.isPlayer);
// //     if (mine.length === 0) return;
// //     const total = GameEngine.calculateReinforcements(mine.length);
// //     const per = Math.floor(total / mine.length);
// //     let remainder = total - per * mine.length;

// //     (async () => {
// //       for (const c of mine) {
// //         const add = per + (remainder > 0 ? 1 : 0);
// //         if (remainder > 0) remainder--;
// //         await updateDoc(doc(db, "games", gameId as string, "countries", c.id), { soldiers: c.soldiers + add });
// //       }
// //       addLog(`🎺 Reinforcements: +${total} soldiers distributed across ${mine.length} countries`);
// //       SoundEngine.reinforce();
// //       setReinforced(true);
// //     })();
// //   }, [loading, phase, round, countries, reinforced, gameId]);

// //   useEffect(() => {
// //     if (gameOutcome === "victory") {
// //       SoundEngine.victory();
// //       MusicPlayer.play("/sounds/victory.mp3", false, 0.6);
// //     }
// //   }, [gameOutcome]);

// //   const handleCountryClick = async (id: string) => {
// //     if (phase !== "player-turn" || attackedThisTurn) return;
// //     const c = countries.find((x) => x.id === id);
// //     if (!c) return;
// //     SoundEngine.click();

// //     if (!selectedAtk) {
// //       if (!c.isPlayer) return addLog("Select your own country first.");
// //       if (c.soldiers < 2) return addLog("Need at least 2 soldiers to attack.");
// //       setSelectedAtk(id);
// //       addLog(`📍 Selected ${c.name} (${c.soldiers} soldiers). Choose target.`);
// //     } else {
// //       const attacker = countries.find((x) => x.id === selectedAtk)!;
// //       if (c.isPlayer) return setSelectedAtk(id);
// //       if (attacker.id === c.id) return;
// //       setSelectedAtk(null);
// //       setAttackedThisTurn(true);
// //       await executeAttack(attacker, c);
// //     }
// //   };

// //   const executeAttack = async (attacker: Country, defender: Country) => {
// //     addLog(`⚔ ${attacker.name} attacks ${defender.name}!`);
// //     MusicPlayer.play("/sounds/battle-theme.mp3", false, 0.4);

// //     setBattle({ attacker, defender });
// //     SoundEngine.clash();
// //     await sleep(2500);
// //     setBattle(null);

// //     const result = GameEngine.resolveRound(attacker.soldiers, defender.soldiers);
// //     SoundEngine.diceRoll();
// //     setDice({ atk: result.atkRolls, def: result.defRolls, showing: true });
// //     await sleep(2000);

// //     SoundEngine.clash();
// //     if (result.atkLosses + result.defLosses > 0) setTimeout(() => SoundEngine.death(), 150);

// //     const newAtk = attacker.soldiers - result.atkLosses;
// //     const newDef = defender.soldiers - result.defLosses;

// //     addLog(`🎲 [${result.atkRolls.join(", ")}] vs [${result.defRolls.join(", ")}] → You −${result.atkLosses}, Enemy −${result.defLosses}`);

// //     try {
// //       const res = await fetch("/api/ai/commentary", {
// //         method: "POST", headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({
// //           attacker: attacker.name, defender: defender.name,
// //           atkRolls: result.atkRolls, defRolls: result.defRolls,
// //           atkLosses: result.atkLosses, defLosses: result.defLosses,
// //           attackerOwner: "Your forces", defenderOwner: "The enemy",
// //         }),
// //       });
// //       const data = await res.json();
// //       addLog(`🎙 ${data.commentary}`);
// //     } catch { addLog("🎙 The battle rages."); }

// //     setDice(null);

// //     if (result.conquered) {
// //       const reward = GameEngine.calculateConquestReward(defender.soldiers);
// //       const maxTransfer = newAtk - 1;
      
// //       const defRef = doc(db, "games", gameId as string, "countries", defender.id);
// //       await updateDoc(defRef, {
// //         soldiers: reward,
// //         isPlayer: true,
// //         ownerId: playerId,
// //       });
// //       await updateDoc(doc(db, "games", gameId as string, "countries", attacker.id), { soldiers: maxTransfer });
      
// //       addLog(`★ CONQUERED ${defender.name}! Base reward: +${reward}. Transfer troops now.`);
// //       SoundEngine.victory();

// //       // Trigger the invading dots animation
// //       setConquestAnimation({ fromId: attacker.id, toId: defender.id });
// //       setTimeout(() => setConquestAnimation(null), 2000);
      
// //       setTransferData({ from: attacker, to: { ...defender, soldiers: reward }, max: maxTransfer, reward });
// //       setTransferAmount(1);
// //       setPhase("transfer");
      
// //     } else {
// //       await updateDoc(doc(db, "games", gameId as string, "countries", defender.id), { soldiers: newDef });
// //       await updateDoc(doc(db, "games", gameId as string, "countries", attacker.id), { soldiers: newAtk });
// //       await finishTurn();
// //     }
// //     MusicPlayer.play("/sounds/login-theme.mp3", true, 0.3);
// //   };

// //   const confirmTransfer = async () => {
// //     if (!transferData) return;
// //     const { from, to, reward } = transferData;
    
// //     await updateDoc(doc(db, "games", gameId as string, "countries", from.id), { soldiers: from.soldiers - transferData.max });
// //     await updateDoc(doc(db, "games", gameId as string, "countries", to.id), { soldiers: reward + transferAmount });

// //     addLog(`🛡 Transferred ${transferAmount} soldiers to ${to.name}.`);
// //     setTransferData(null);
// //     await finishTurn();
// //   };

// //   const finishTurn = async () => {
// //     await runNpcTurns();
// //     setAttackedThisTurn(false);
// //   };

// //   const runNpcTurns = async () => {
// //     setPhase("npc-turn");
// //     addLog("🤖 NPC nations are moving...");

// //     const snap = await new Promise<Country[]>((resolve) => {
// //       const unsub = onSnapshot(collection(db, "games", gameId as string, "countries"), (s) => {
// //         resolve(s.docs.map((d) => d.data() as Country));
// //         unsub();
// //       });
// //     });

// //     const npcGroups = new Map<string, Country[]>();
// //     snap.forEach((c) => {
// //       if (!c.isPlayer) {
// //         if (!npcGroups.has(c.ownerId)) npcGroups.set(c.ownerId, []);
// //         npcGroups.get(c.ownerId)!.push(c);
// //       }
// //     });

// //     for (const npcId of npcGroups.keys()) {
// //       const current = await new Promise<Country[]>((resolve) => {
// //         const unsub = onSnapshot(collection(db, "games", gameId as string, "countries"), (s) => {
// //           resolve(s.docs.map((d) => d.data() as Country));
// //           unsub();
// //         });
// //       });

// //       const npcAlive = current.filter((c) => c.ownerId === npcId);
// //       if (npcAlive.length === 0) continue;

// //       const pick = GameEngine.pickNpcTarget(npcAlive, current);
// //       if (!pick) { await sleep(400); continue; }

// //       const res = GameEngine.resolveRound(pick.attacker.soldiers, pick.defender.soldiers);
// //       addLog(`🤖 ${pick.attacker.name} attacks ${pick.defender.name}: [${res.atkRolls.join(",")}] vs [${res.defRolls.join(",")}]`);

// //       const newA = pick.attacker.soldiers - res.atkLosses;
// //       const newD = pick.defender.soldiers - res.defLosses;

// //       if (res.conquered) {
// //         const reward = GameEngine.calculateConquestReward(pick.defender.soldiers);
// //         await updateDoc(doc(db, "games", gameId as string, "countries", pick.defender.id), {
// //           soldiers: reward + Math.max(1, newA - 1), isPlayer: false, ownerId: npcId,
// //         });
// //         await updateDoc(doc(db, "games", gameId as string, "countries", pick.attacker.id), { soldiers: 1 });
// //         addLog(`💀 ${pick.defender.name} has fallen to ${pick.attacker.name}!`);
// //       } else {
// //         await updateDoc(doc(db, "games", gameId as string, "countries", pick.attacker.id), { soldiers: newA });
// //         await updateDoc(doc(db, "games", gameId as string, "countries", pick.defender.id), { soldiers: newD });
// //       }
// //       await sleep(600);
// //     }

// //     const nextRound = round + 1;
// //     await updateDoc(doc(db, "games", gameId as string), { turnNumber: nextRound });
// //     setRound(nextRound);
// //     setReinforced(false);
// //     setPhase("player-turn");
// //     addLog(`━━━ Round ${nextRound} · Your turn ━━━`);
// //   };

// //   const handleSkip = async () => {
// //     if (phase !== "player-turn") return;
// //     SoundEngine.click();
// //     setSelectedAtk(null);
// //     addLog("⏭ You skip your attack.");
// //     await finishTurn();
// //   };

// //   if (loading) return <div className="flex h-screen items-center justify-center bg-[#03050a] text-[#f4c430] text-2xl font-black tracking-widest animate-pulse">LOADING WORLD...</div>;

// //   if (phase === "game-over" || gameOutcome) {
// //     const won = gameOutcome === "victory";
// //     return (
// //       <div className="min-h-screen flex flex-col items-center justify-center bg-[#03050a] p-8">
// //         <h1 className={`text-6xl font-black tracking-widest uppercase mb-8 ${won ? "text-[#f4c430]" : "text-red-500"}`}>{won ? "★ VICTORY ★" : "💀 DEFEAT 💀"}</h1>
// //         <button onClick={() => router.push("/lobby")} className="px-8 py-4 bg-[#f4c430] text-black font-black rounded-lg hover:bg-yellow-500 uppercase tracking-widest">Return to War Room</button>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="min-h-screen bg-[#03050a] p-4 md:p-8">
// //       {/* 2D Soldier Fighting Animation */}
// //       {battle && <BattleScene {...{ ...battle, attackerName: battle.attacker.name, defenderName: battle.defender.name, attackerFlag: battle.attacker.flag, defenderFlag: battle.defender.flag, attackerSoldiers: battle.attacker.soldiers, defenderSoldiers: battle.defender.soldiers, onComplete: () => {} }} />}
      
// //       {/* 3D Dice Roll Animation */}
// //       {dice && <DiceOverlay attackerRolls={dice.atk} defenderRolls={dice.def} showing={dice.showing} />}

// //       {/* Transfer Modal */}
// //       {phase === "transfer" && transferData && (
// //         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
// //           <div className="bg-[#0a1424] border-2 border-[#f4c430] p-8 rounded-2xl max-w-md w-full shadow-2xl">
// //             <h2 className="text-2xl text-[#f4c430] font-black uppercase tracking-widest mb-2 text-center">Conquered!</h2>
// //             <p className="text-gray-300 text-center mb-6 text-sm">Choose how many soldiers to transfer from {transferData.from.name} to {transferData.to.name}.</p>
// //             <div className="flex items-center justify-center gap-6 mb-8">
// //               <button onClick={() => setTransferAmount(Math.max(1, transferAmount - 1))} className="w-12 h-12 bg-black/50 border border-[#f4c430]/30 rounded-full text-[#f4c430] text-2xl font-bold hover:bg-[#f4c430]/20 transition">−</button>
// //               <div className="text-5xl font-black text-white">{transferAmount}</div>
// //               <button onClick={() => setTransferAmount(Math.min(transferData.max, transferAmount + 1))} className="w-12 h-12 bg-black/50 border border-[#f4c430]/30 rounded-full text-[#f4c430] text-2xl font-bold hover:bg-[#f4c430]/20 transition">+</button>
// //             </div>
// //             <button onClick={confirmTransfer} className="w-full bg-[#f4c430] text-black font-black py-4 rounded-xl hover:bg-yellow-500 transition tracking-widest uppercase">Confirm Transfer</button>
// //           </div>
// //         </div>
// //       )}

// //       <div className="max-w-7xl mx-auto">
// //         <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
// //           <div>
// //             <h1 className="text-3xl text-[#f4c430] tracking-widest font-black uppercase">Round {round}</h1>
// //             <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{phase === "player-turn" ? (attackedThisTurn ? "NPC TURNS..." : "YOUR TURN") : phase.toUpperCase()}</p>
// //           </div>
// //           <div className="flex gap-2 items-center">
// //             <button onClick={() => setFastForward(!fastForward)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border ${fastForward ? "bg-[#f4c430] text-black border-[#f4c430]" : "border-[#f4c430]/30 text-[#f4c430] hover:bg-[#f4c430]/10"}`}>{fastForward ? "⏩ Fast ON" : "⏩ Fast"}</button>
// //             <button onClick={handleSkip} disabled={phase !== "player-turn" || attackedThisTurn} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-[#f4c430]/30 text-[#f4c430] hover:bg-[#f4c430]/10 disabled:opacity-30">⏭ Skip Turn</button>
// //             <button onClick={() => router.push("/lobby")} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-black/50 border border-white/10 text-gray-400 hover:text-white">Exit</button>
// //           </div>
// //         </div>

// //         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
// //           <div className="lg:col-span-2">
// //             {/* Pass the conquest animation trigger to the map */}
// //             <RiskMap countries={countries} onCountryClick={handleCountryClick} selectedAtk={selectedAtk} conquestAnimation={conquestAnimation} />
// //           </div>
// //           <div className="bg-[#0a1424]/80 backdrop-blur-md rounded-xl border border-[#f4c430]/20 p-4 flex flex-col h-[65vh]">
// //             <h2 className="text-[#f4c430] text-sm font-black uppercase tracking-widest border-b border-[#f4c430]/20 pb-2 mb-3">📡 War Correspondent</h2>
// //             <div className="flex-1 overflow-y-auto space-y-2 text-xs font-mono">
// //               {log.map((m, i) => <div key={i} className="p-2 bg-black/40 rounded border-l-2 border-[#f4c430]/40 text-gray-300">{m}</div>)}
// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   
